import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  private assertWithinEditWindow(createdAt: Date): void {
    const elapsed = Date.now() - createdAt.getTime();
    if (elapsed > REVIEW_EDIT_WINDOW_MS) {
      throw new ForbiddenException(
        'Reviews só podem ser editadas ou removidas dentro de 24 horas após a criação.',
      );
    }
  }

  async create(userId: string, dto: CreateReviewDto) {
    const movie = await this.prisma.movie.findUnique({ where: { id: dto.movieId } });
    if (!movie) throw new NotFoundException('Filme não encontrado');
    if (movie.userId !== userId) throw new ForbiddenException('Acesso negado');

    const existing = await this.prisma.review.findUnique({ where: { movieId: dto.movieId } });
    if (existing) throw new ConflictException('Este filme já possui uma review');

    const watchedAt = dto.watchedAt ? new Date(dto.watchedAt) : new Date();

    const review = await this.prisma.$transaction(async (tx) => {
      await tx.movie.update({
        where: { id: dto.movieId },
        data: { watched: true },
      });
      await tx.drawnMovie.deleteMany({ where: { movieId: dto.movieId } });

      return tx.review.create({
        data: {
          text: dto.text,
          watchedAt,
          movieId: dto.movieId,
          userId,
        },
        include: { movie: true },
      });
    });

    await this.activityService.log(userId, 'movie_watched', {
      movieId: movie.id,
      movieTitle: movie.title,
      reviewId: review.id,
    });

    return review;
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { movie: true },
    });
    if (!review) throw new NotFoundException('Review não encontrada');
    if (review.userId !== userId) throw new ForbiddenException('Acesso negado');

    this.assertWithinEditWindow(review.createdAt);

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        text: dto.text,
        ...(dto.watchedAt && { watchedAt: new Date(dto.watchedAt) }),
      },
      include: { movie: true },
    });
  }

  async remove(userId: string, reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review não encontrada');
    if (review.userId !== userId) throw new ForbiddenException('Acesso negado');

    this.assertWithinEditWindow(review.createdAt);

    await this.prisma.review.delete({ where: { id: reviewId } });
  }

  async findWatched(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { userId, movie: { watched: true } };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { watchedAt: 'desc' },
        include: { movie: true },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByMovieId(userId: string, movieId: string) {
    const review = await this.prisma.review.findUnique({
      where: { movieId },
      include: { movie: true },
    });
    if (!review) return null;
    if (review.userId !== userId) throw new ForbiddenException('Acesso negado');
    return review;
  }
}
