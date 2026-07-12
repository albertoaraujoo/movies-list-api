import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { Movie, DrawnMovie, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { ListsService } from '../lists/lists.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { FilterMoviesDto } from './dto/filter-movies.dto';
import { resolveGenreFilterValues } from './genre.utils';

const DRAWN_LIST_MAX_SIZE = 30;
const TMDB_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w92';

export interface PaginatedMovies {
  data: Movie[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    watchedTotal: number;
    unwatchedTotal: number;
  };
}

export interface DrawnMovieWithMovie extends DrawnMovie {
  movie: Movie;
}

export interface DeduplicateResult {
  removedCount: number;
  groups: Array<{
    kept: Movie;
    removed: Movie[];
  }>;
}

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdbService: TmdbService,
    private readonly listsService: ListsService,
  ) {}

  /**
   * Verifica se já existe filme do usuário com o mesmo tmdbId ou mesmo título+ano (evita duplicatas).
   */
  private async findExistingDuplicate(
    userId: string,
    params: { tmdbId?: number | null; title: string; year?: number | null },
  ): Promise<Movie | null> {
    const { tmdbId, title, year } = params;
    if (tmdbId != null) {
      const byTmdb = await this.prisma.movie.findFirst({
        where: { userId, tmdbId },
      });
      if (byTmdb) return byTmdb;
    }
    return this.prisma.movie.findFirst({
      where: {
        userId,
        title: { equals: title.trim(), mode: 'insensitive' },
        year: year ?? null,
      },
    });
  }

  /**
   * Enriquece watchProvidersBr com logoUrl (URL completa) em cada provider para exibição no frontend.
   */
  private withProviderLogoUrls<T extends { watchProvidersBr?: Prisma.JsonValue | null }>(item: T): T {
    const raw = item.watchProvidersBr as Record<string, unknown> | null | undefined;
    if (!raw || typeof raw !== 'object') return item;

    const enrich = (arr: unknown[] | undefined) =>
      Array.isArray(arr)
        ? arr.map((p) => {
            const provider = p as Record<string, unknown>;
            const path = provider?.logo_path as string | undefined;
            return { ...provider, logoUrl: path ? `${TMDB_LOGO_BASE_URL}${path}` : undefined };
          })
        : undefined;

    const watchProvidersBr = {
      ...raw,
      flatrate: enrich(raw.flatrate as unknown[] | undefined),
      rent: enrich(raw.rent as unknown[] | undefined),
      buy: enrich(raw.buy as unknown[] | undefined),
    };

    return { ...item, watchProvidersBr };
  }

  private withFavoriteFlag<T extends { id: string }>(
    item: T,
    favoriteIds: Set<string>,
  ): T & { isFavorite: boolean } {
    return { ...item, isFavorite: favoriteIds.has(item.id) };
  }

  private withFavoriteFlags<T extends { id: string }>(
    items: T[],
    favoriteIds: Set<string>,
  ): (T & { isFavorite: boolean })[] {
    return items.map((item) => this.withFavoriteFlag(item, favoriteIds));
  }

  private enrichMovie<T extends { id: string; watchProvidersBr?: Prisma.JsonValue | null }>(
    item: T,
    favoriteIds: Set<string>,
  ): T & { isFavorite: boolean } {
    return this.withFavoriteFlag(this.withProviderLogoUrls(item), favoriteIds);
  }

  async create(userId: string, createMovieDto: CreateMovieDto): Promise<Movie> {
    const { title, year, tmdbId: providedTmdbId, listIds, ...rest } = createMovieDto;

    let enrichedData: Partial<
      Pick<Movie, 'director' | 'year' | 'posterPath' | 'tmdbId' | 'overview' | 'runtime' | 'watchProvidersBr' | 'genres'>
    > = {};

    if (providedTmdbId) {
      const tmdbData = await this.tmdbService.getMovieDetails(providedTmdbId);
      if (tmdbData) {
        enrichedData = {
          director: tmdbData.director ?? undefined,
          year: tmdbData.year ?? undefined,
          posterPath: tmdbData.posterPath ?? undefined,
          tmdbId: tmdbData.tmdbId,
          overview: tmdbData.overview ?? undefined,
          runtime: tmdbData.runtime ?? undefined,
          genres: tmdbData.genres ?? [],
          watchProvidersBr: (tmdbData.watchProvidersBr ?? undefined) as Prisma.JsonValue,
        };
      }
    } else {
      const tmdbData = await this.tmdbService.searchAndEnrich(title, year);
      if (tmdbData) {
        enrichedData = {
          director: rest.director ?? tmdbData.director ?? undefined,
          year: year ?? tmdbData.year ?? undefined,
          posterPath: tmdbData.posterPath ?? undefined,
          tmdbId: tmdbData.tmdbId,
          overview: tmdbData.overview ?? undefined,
          runtime: tmdbData.runtime ?? undefined,
          genres: tmdbData.genres ?? [],
          watchProvidersBr: (tmdbData.watchProvidersBr ?? undefined) as Prisma.JsonValue,
        };
      }
    }

    const resolvedTmdbId = enrichedData.tmdbId ?? providedTmdbId ?? null;
    const resolvedYear = year ?? enrichedData.year ?? null;
    const existing = await this.findExistingDuplicate(userId, {
      tmdbId: resolvedTmdbId,
      title: title.trim(),
      year: resolvedYear,
    });

    // Filme já existe na biblioteca: só adiciona às listas pedidas (não cria duplicata)
    if (existing) {
      if (listIds && listIds.length > 0) {
        await this.listsService.addMovieToLists(userId, existing.id, listIds);
        return this.withProviderLogoUrls(existing);
      }
      throw new BadRequestException(
        'Você já possui este filme na biblioteca. Não é possível adicionar duplicatas.',
      );
    }

    const movie = await this.prisma.movie.create({
      data: {
        title,
        year,
        ...rest,
        ...enrichedData,
        userId,
      } as Prisma.MovieUncheckedCreateInput,
    });

    if (listIds && listIds.length > 0) {
      await this.listsService.addMovieToLists(userId, movie.id, listIds);
    }

    return this.withProviderLogoUrls(movie);
  }

  async bulkCreate(
    userId: string,
    movies: CreateMovieDto[],
    listIds?: string[],
  ): Promise<Movie[]> {
    const created: Movie[] = [];
    for (const dto of movies) {
      const movie = await this.create(userId, {
        ...dto,
        listIds: listIds ?? dto.listIds,
      });
      created.push(movie);
    }
    return created;
  }

  async findAll(userId: string, filters: FilterMoviesDto): Promise<PaginatedMovies> {
    const { search, watched, year, director, genre, listId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    if (listId) {
      await this.listsService.findOne(userId, listId);
    }

    const listScope: Prisma.MovieWhereInput = listId
      ? { listItems: { some: { listId } } }
      : {};

    const where: Prisma.MovieWhereInput = {
      userId,
      ...listScope,
      ...(watched !== undefined && { watched }),
      ...(year && { year }),
      ...(director && { director: { contains: director, mode: 'insensitive' } }),
      ...(genre && {
        genres: { hasSome: resolveGenreFilterValues(genre) },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { director: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total, watchedTotal, unwatchedTotal] = await this.prisma.$transaction([
      this.prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { drawn: true, review: true },
      }),
      this.prisma.movie.count({ where }),
      this.prisma.movie.count({ where: { userId, watched: true, ...listScope } }),
      this.prisma.movie.count({ where: { userId, watched: false, ...listScope } }),
    ]);

    const favorites = await this.listsService.getFavoritesMovieIds(userId);

    return {
      data: this.withFavoriteFlags(
        data.map((m) => this.withProviderLogoUrls(m)),
        favorites,
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        watchedTotal,
        unwatchedTotal,
      },
    };
  }

  async findOne(userId: string, movieId: string): Promise<Movie> {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      include: { drawn: true, review: true },
    });

    if (!movie) {
      throw new NotFoundException(`Filme com ID "${movieId}" não encontrado`);
    }

    if (movie.userId !== userId) {
      throw new ForbiddenException('Acesso negado: este filme pertence a outro usuário');
    }

    const favoriteIds = await this.listsService.getFavoritesMovieIds(userId);
    return this.enrichMovie(movie, favoriteIds);
  }

  async update(userId: string, movieId: string, updateMovieDto: UpdateMovieDto): Promise<Movie> {
    await this.findOne(userId, movieId);

    return this.prisma.$transaction(async (tx) => {
      const updatedMovie = await tx.movie.update({
        where: { id: movieId },
        data: updateMovieDto,
      });

      if (updateMovieDto.watched === true) {
        await tx.drawnMovie.deleteMany({ where: { movieId } });
        this.logger.log(
          `Filme "${updatedMovie.title}" marcado como assistido - removido da lista de sorteados`,
        );
      }

      return this.withProviderLogoUrls(updatedMovie);
    });
  }

  async remove(userId: string, movieId: string): Promise<void> {
    await this.findOne(userId, movieId);
    await this.prisma.movie.delete({ where: { id: movieId } });
  }

  async syncWithTmdb(userId: string, movieId: string, tmdbId?: number): Promise<Movie> {
    const movie = await this.findOne(userId, movieId);

    const targetTmdbId = tmdbId ?? movie.tmdbId ?? null;

    let tmdbData = null;

    if (targetTmdbId) {
      tmdbData = await this.tmdbService.getMovieDetails(targetTmdbId);
    } else {
      tmdbData = await this.tmdbService.searchAndEnrich(movie.title, movie.year);
    }

    if (!tmdbData) {
      throw new NotFoundException(
        `Nenhum resultado encontrado na TMDB para o filme "${movie.title}"`,
      );
    }

    const updatedMovie = await this.prisma.movie.update({
      where: { id: movieId },
      data: {
        tmdbId: tmdbData.tmdbId,
        posterPath: tmdbData.posterPath,
        director: movie.director ?? tmdbData.director,
        year: movie.year ?? tmdbData.year,
        overview: tmdbData.overview ?? undefined,
        runtime: tmdbData.runtime ?? undefined,
        genres: tmdbData.genres ?? movie.genres,
        watchProvidersBr: (tmdbData.watchProvidersBr ?? undefined) as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Filme "${movie.title}" sincronizado com TMDB ID ${tmdbData.tmdbId}`);
    return this.withProviderLogoUrls(updatedMovie);
  }

  async backfillGenres(
    userId: string,
    limit = 40,
  ): Promise<{ updated: number; remaining: number }> {
    const movies = await this.prisma.movie.findMany({
      where: {
        userId,
        genres: { isEmpty: true },
      },
      select: { id: true, tmdbId: true, title: true, year: true },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    if (movies.length === 0) {
      return { updated: 0, remaining: 0 };
    }

    let updated = 0;
    const concurrency = 5;

    for (let i = 0; i < movies.length; i += concurrency) {
      const batch = movies.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (movie) => {
          const tmdbData = movie.tmdbId
            ? await this.tmdbService.getMovieDetails(movie.tmdbId)
            : await this.tmdbService.searchAndEnrich(movie.title, movie.year);

          if (!tmdbData?.genres?.length) return false;

          await this.prisma.movie.update({
            where: { id: movie.id },
            data: {
              genres: tmdbData.genres,
              ...(movie.tmdbId == null && tmdbData.tmdbId ? { tmdbId: tmdbData.tmdbId } : {}),
            },
          });
          return true;
        }),
      );

      updated += results.filter(Boolean).length;
    }

    const remaining = await this.prisma.movie.count({
      where: { userId, genres: { isEmpty: true } },
    });

    this.logger.log(
      `Backfill de gêneros: ${updated} atualizado(s), ${remaining} pendente(s) (user ${userId})`,
    );

    return { updated, remaining };
  }

  async drawMovie(userId: string): Promise<DrawnMovieWithMovie> {
    const defaultMovieIds = await this.listsService.getDefaultListMovieIds(userId);

    return this.prisma.$transaction(async (tx) => {
      const eligibleMovies = await tx.movie.findMany({
        where: {
          userId,
          watched: false,
          drawn: null,
          id: { in: defaultMovieIds.length > 0 ? defaultMovieIds : ['__none__'] },
        },
        select: { id: true, title: true },
      });

      if (eligibleMovies.length === 0) {
        throw new BadRequestException(
          'Nenhum filme disponível para sortear. Todos os filmes já foram sorteados ou assistidos.',
        );
      }

      const drawnCount = await tx.drawnMovie.count({
        where: { movie: { userId } },
      });

      if (drawnCount >= DRAWN_LIST_MAX_SIZE) {
        throw new BadRequestException(
          `A lista de sorteados atingiu o limite máximo de ${DRAWN_LIST_MAX_SIZE} itens. Remova alguns antes de sortear novamente.`,
        );
      }

      const randomIndex = Math.floor(Math.random() * eligibleMovies.length);
      const selectedMovie = eligibleMovies[randomIndex];

      const maxOrderResult = await tx.drawnMovie.aggregate({
        where: { movie: { userId } },
        _max: { order: true },
      });

      const nextOrder = (maxOrderResult._max.order ?? 0) + 1;

      const drawn = await tx.drawnMovie.create({
        data: { movieId: selectedMovie.id, order: nextOrder },
        include: { movie: true },
      });

      this.logger.log(
        `Filme sorteado: "${selectedMovie.title}" (posição ${nextOrder}) para usuário ${userId}`,
      );

      return { ...drawn, movie: this.withProviderLogoUrls(drawn.movie) };
    });
  }

  async addToDrawnList(userId: string, movieId: string): Promise<DrawnMovieWithMovie> {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      include: { drawn: true },
    });

    if (!movie) {
      throw new NotFoundException(`Filme com ID "${movieId}" não encontrado`);
    }

    if (movie.userId !== userId) {
      throw new ForbiddenException('Acesso negado: este filme pertence a outro usuário');
    }

    if (movie.drawn) {
      throw new BadRequestException('Este filme já está na lista de sorteados');
    }

    const drawnCount = await this.prisma.drawnMovie.count({
      where: { movie: { userId } },
    });

    if (drawnCount >= DRAWN_LIST_MAX_SIZE) {
      throw new BadRequestException(
        `A lista de sorteados atingiu o limite máximo de ${DRAWN_LIST_MAX_SIZE} itens. Remova alguns antes de adicionar.`,
      );
    }

    const maxOrderResult = await this.prisma.drawnMovie.aggregate({
      where: { movie: { userId } },
      _max: { order: true },
    });

    const nextOrder = (maxOrderResult._max.order ?? 0) + 1;

    const drawn = await this.prisma.drawnMovie.create({
      data: { movieId, order: nextOrder },
      include: { movie: true },
    });

    this.logger.log(`Filme "${movie.title}" adicionado à lista de sorteados (posição ${nextOrder})`);
    return { ...drawn, movie: this.withProviderLogoUrls(drawn.movie) } as DrawnMovieWithMovie;
  }

  /**
   * Cria um filme a partir da TMDB (como POST /movies) e adiciona diretamente à lista de sorteados.
   * Se o filme já existir na lista do usuário, adiciona o existente à lista de sorteados (evita duplicata).
   */
  async createMovieAndAddToDrawn(
    userId: string,
    createMovieDto: CreateMovieDto,
  ): Promise<DrawnMovieWithMovie> {
    const { title, year, tmdbId } = createMovieDto;
    const existing = await this.findExistingDuplicate(userId, {
      tmdbId: tmdbId ?? null,
      title: title.trim(),
      year: year ?? null,
    });
    if (existing) {
      return this.addToDrawnList(userId, existing.id);
    }
    const movie = await this.create(userId, createMovieDto);
    return this.addToDrawnList(userId, movie.id);
  }

  async getDrawnList(userId: string): Promise<DrawnMovieWithMovie[]> {
    const list = await this.prisma.drawnMovie.findMany({
      where: { movie: { userId } },
      include: { movie: true },
      orderBy: { order: 'asc' },
    });
    return list.map((d) => ({ ...d, movie: this.withProviderLogoUrls(d.movie) })) as DrawnMovieWithMovie[];
  }

  /**
   * Varre todos os filmes do usuário, agrupa por tmdbId (ou título+ano) e remove duplicatas,
   * mantendo um representante de cada grupo (preferindo o que tem tmdbId e o mais antigo).
   */
  async deduplicate(userId: string): Promise<DeduplicateResult> {
    const all = await this.prisma.movie.findMany({
      where: { userId },
      include: { drawn: true },
      orderBy: { createdAt: 'asc' },
    });

    const key = (m: Movie) =>
      m.tmdbId != null ? `tmdb:${m.tmdbId}` : `title:${m.title.toLowerCase().trim()}:year:${m.year ?? 'null'}`;

    const byKey = new Map<string, Movie[]>();
    for (const m of all) {
      const k = key(m);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(m);
    }

    const groups: Array<{ kept: Movie; removed: Movie[] }> = [];
    const toDelete: string[] = [];

    for (const [, movies] of byKey) {
      if (movies.length <= 1) continue;
      const sorted = [...movies].sort((a, b) => {
        const aHasTmdb = a.tmdbId != null ? 0 : 1;
        const bHasTmdb = b.tmdbId != null ? 0 : 1;
        if (aHasTmdb !== bHasTmdb) return aHasTmdb - bHasTmdb;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      const [kept, ...removed] = sorted;
      groups.push({ kept: this.withProviderLogoUrls(kept), removed: removed.map((m) => this.withProviderLogoUrls(m)) });
      toDelete.push(...removed.map((m) => m.id));
    }

    if (toDelete.length > 0) {
      await this.prisma.$transaction(toDelete.map((id) => this.prisma.movie.delete({ where: { id } })));
      this.logger.log(`Deduplicação: ${toDelete.length} filme(s) removido(s) para o usuário ${userId}`);
    }

    return { removedCount: toDelete.length, groups };
  }

  async removeFromDrawnList(userId: string, drawnMovieId: string): Promise<void> {
    const drawnMovie = await this.prisma.drawnMovie.findUnique({
      where: { id: drawnMovieId },
      include: { movie: true },
    });

    if (!drawnMovie) {
      throw new NotFoundException(
        `Entrada na lista de sorteados com ID "${drawnMovieId}" não encontrada`,
      );
    }

    if (drawnMovie.movie.userId !== userId) {
      throw new ForbiddenException('Acesso negado: este item pertence a outro usuário');
    }

    await this.prisma.drawnMovie.delete({ where: { id: drawnMovieId } });
  }
}
