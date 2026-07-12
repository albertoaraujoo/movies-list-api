import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

@Injectable()
export class ListsService {
  private readonly logger = new Logger(ListsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async ensureDefaultList(userId: string) {
    const existing = await this.prisma.movieList.findFirst({
      where: { userId, isDefault: true },
    });
    if (existing) return existing;

    return this.prisma.movieList.create({
      data: {
        name: 'Minha Lista',
        description: 'Lista principal de filmes',
        isDefault: true,
        userId,
      },
    });
  }

  async create(userId: string, dto: CreateListDto) {
    const list = await this.prisma.movieList.create({
      data: {
        name: dto.name,
        description: dto.description,
        isNumbered: dto.isNumbered ?? false,
        isRanked: dto.isRanked ?? false,
        isDefault: false,
        userId,
      },
    });

    await this.activityService.log(userId, 'list_created', {
      listId: list.id,
      listName: list.name,
    });

    return list;
  }

  async findAll(userId: string) {
    await this.ensureDefaultList(userId);
    return this.prisma.movieList.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: { _count: { select: { items: true } } },
    });
  }

  async findOne(userId: string, listId: string) {
    const list = await this.prisma.movieList.findUnique({
      where: { id: listId },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: { movie: true },
        },
      },
    });

    if (!list) throw new NotFoundException('Lista não encontrada');
    if (list.userId !== userId) throw new ForbiddenException('Acesso negado');

    return list;
  }

  async update(userId: string, listId: string, dto: UpdateListDto) {
    const list = await this.findOne(userId, listId);
    if (list.isDefault && dto.name && dto.name !== list.name) {
      throw new BadRequestException('Não é possível renomear a lista principal');
    }

    return this.prisma.movieList.update({
      where: { id: listId },
      data: dto,
    });
  }

  async remove(userId: string, listId: string): Promise<void> {
    const list = await this.findOne(userId, listId);
    if (list.isDefault) {
      throw new BadRequestException('Não é possível excluir a lista principal');
    }
    await this.prisma.movieList.delete({ where: { id: listId } });
  }

  async addMovie(userId: string, listId: string, movieId: string) {
    await this.findOne(userId, listId);

    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) throw new NotFoundException('Filme não encontrado');
    if (movie.userId !== userId) throw new ForbiddenException('Acesso negado');

    const existing = await this.prisma.movieListItem.findUnique({
      where: { listId_movieId: { listId, movieId } },
    });
    if (existing) throw new BadRequestException('Filme já está nesta lista');

    const maxOrder = await this.prisma.movieListItem.aggregate({
      where: { listId },
      _max: { order: true },
    });

    return this.prisma.movieListItem.create({
      data: {
        listId,
        movieId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: { movie: true },
    });
  }

  async removeMovie(userId: string, listId: string, movieId: string): Promise<void> {
    await this.findOne(userId, listId);
    const item = await this.prisma.movieListItem.findUnique({
      where: { listId_movieId: { listId, movieId } },
    });
    if (!item) throw new NotFoundException('Filme não está nesta lista');
    await this.prisma.movieListItem.delete({ where: { id: item.id } });
  }

  async reorder(userId: string, listId: string, movieIds: string[]) {
    const list = await this.findOne(userId, listId);

    await this.prisma.$transaction(
      movieIds.map((movieId, index) =>
        this.prisma.movieListItem.updateMany({
          where: { listId: list.id, movieId },
          data: { order: index },
        }),
      ),
    );

    return this.findOne(userId, listId);
  }

  async getDefaultListMovieIds(userId: string): Promise<string[]> {
    const defaultList = await this.ensureDefaultList(userId);
    const items = await this.prisma.movieListItem.findMany({
      where: { listId: defaultList.id },
      select: { movieId: true },
    });
    return items.map((i) => i.movieId);
  }

  async addMovieToLists(userId: string, movieId: string, listIds: string[]) {
    for (const listId of listIds) {
      try {
        await this.addMovie(userId, listId, movieId);
      } catch (err) {
        if ((err as BadRequestException).message?.includes('já está')) continue;
        throw err;
      }
    }
  }
}
