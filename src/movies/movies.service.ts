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
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { FilterMoviesDto } from './dto/filter-movies.dto';

const DRAWN_LIST_MAX_SIZE = 30;
const TMDB_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w92';

export interface PaginatedMovies {
  data: Movie[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DrawnMovieWithMovie extends DrawnMovie {
  movie: Movie;
}

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdbService: TmdbService,
  ) {}

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

  async create(userId: string, createMovieDto: CreateMovieDto): Promise<Movie> {
    const { title, year, tmdbId: providedTmdbId, ...rest } = createMovieDto;

    let enrichedData: Partial<
      Pick<Movie, 'director' | 'year' | 'posterPath' | 'tmdbId' | 'overview' | 'runtime' | 'watchProvidersBr'>
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
          watchProvidersBr: (tmdbData.watchProvidersBr ?? undefined) as Prisma.JsonValue,
        };
      }
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
    return this.withProviderLogoUrls(movie);
  }

  async findAll(userId: string, filters: FilterMoviesDto): Promise<PaginatedMovies> {
    const { search, watched, year, director, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.MovieWhereInput = {
      userId,
      ...(watched !== undefined && { watched }),
      ...(year && { year }),
      ...(director && { director: { contains: director, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { director: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { drawn: true },
      }),
      this.prisma.movie.count({ where }),
    ]);

    return {
      data: data.map((m) => this.withProviderLogoUrls(m)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(userId: string, movieId: string): Promise<Movie> {
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

    return this.withProviderLogoUrls(movie);
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
        watchProvidersBr: (tmdbData.watchProvidersBr ?? undefined) as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Filme "${movie.title}" sincronizado com TMDB ID ${tmdbData.tmdbId}`);
    return this.withProviderLogoUrls(updatedMovie);
  }

  async drawMovie(userId: string): Promise<DrawnMovieWithMovie> {
    return this.prisma.$transaction(async (tx) => {
      const eligibleMovies = await tx.movie.findMany({
        where: { userId, watched: false, drawn: null },
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

  async getDrawnList(userId: string): Promise<DrawnMovieWithMovie[]> {
    const list = await this.prisma.drawnMovie.findMany({
      where: { movie: { userId } },
      include: { movie: true },
      orderBy: { order: 'asc' },
    });
    return list.map((d) => ({ ...d, movie: this.withProviderLogoUrls(d.movie) })) as DrawnMovieWithMovie[];
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
