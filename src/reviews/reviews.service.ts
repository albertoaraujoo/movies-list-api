import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { UsersService } from '../users/users.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';

export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const authorSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
} as const;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly usersService: UsersService,
  ) {}

  private assertWithinEditWindow(createdAt: Date): void {
    const elapsed = Date.now() - createdAt.getTime();
    if (elapsed > REVIEW_EDIT_WINDOW_MS) {
      throw new ForbiddenException(
        'Reviews só podem ser editadas ou removidas dentro de 24 horas após a criação.',
      );
    }
  }

  private async assertCanViewReview(viewerId: string, reviewUserId: string): Promise<void> {
    const canView = await this.usersService.canViewProfile(viewerId, reviewUserId);
    if (!canView) {
      throw new ForbiddenException('Você não tem permissão para ver esta review');
    }
  }

  private async getReviewOrThrow(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: authorSelect },
        movie: true,
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!review) throw new NotFoundException('Review não encontrada');
    return review;
  }

  private mapReviewWithSocial(
    review: Awaited<ReturnType<ReviewsService['getReviewOrThrow']>>,
    viewerId: string,
    likedByMe: boolean,
  ) {
    const { _count, ...rest } = review;
    return {
      ...rest,
      likesCount: _count.likes,
      commentsCount: _count.comments,
      likedByMe,
    };
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
        include: { movie: true, user: { select: authorSelect } },
      });
    });

    await this.activityService.log(userId, 'movie_watched', {
      movieId: movie.id,
      movieTitle: movie.title,
      reviewId: review.id,
    });

    return {
      ...review,
      likesCount: 0,
      commentsCount: 0,
      likedByMe: false,
    };
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { movie: true, user: { select: authorSelect } },
    });
    if (!review) throw new NotFoundException('Review não encontrada');
    if (review.userId !== userId) throw new ForbiddenException('Acesso negado');

    this.assertWithinEditWindow(review.createdAt);

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        text: dto.text,
        ...(dto.watchedAt && { watchedAt: new Date(dto.watchedAt) }),
      },
      include: {
        movie: true,
        user: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const liked = await this.prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });

    return this.mapReviewWithSocial(updated, userId, !!liked);
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
        include: {
          movie: true,
          user: { select: authorSelect },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: data.map((review) => ({
        ...review,
        likesCount: review._count.likes,
        commentsCount: review._count.comments,
        likedByMe: false,
        _count: undefined,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByMovieId(userId: string, movieId: string) {
    const review = await this.prisma.review.findUnique({
      where: { movieId },
      include: {
        movie: true,
        user: { select: authorSelect },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!review) return null;
    if (review.userId !== userId) throw new ForbiddenException('Acesso negado');

    const liked = await this.prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId: review.id, userId } },
    });

    return this.mapReviewWithSocial(review, userId, !!liked);
  }

  async findPublicByUsername(viewerId: string, username: string, page = 1, limit = 20) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.assertCanViewReview(viewerId, user.id);

    const skip = (page - 1) * limit;
    const where = { userId: user.id };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { watchedAt: 'desc' },
        include: {
          movie: true,
          user: { select: authorSelect },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const likedIds = new Set(
      (
        await this.prisma.reviewLike.findMany({
          where: { userId: viewerId, reviewId: { in: data.map((r) => r.id) } },
          select: { reviewId: true },
        })
      ).map((l) => l.reviewId),
    );

    return {
      data: data.map((review) => ({
        ...review,
        likesCount: review._count.likes,
        commentsCount: review._count.comments,
        likedByMe: likedIds.has(review.id),
        _count: undefined,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getThread(viewerId: string, reviewId: string) {
    const review = await this.getReviewOrThrow(reviewId);
    await this.assertCanViewReview(viewerId, review.userId);

    const liked = await this.prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId, userId: viewerId } },
    });

    const comments = await this.prisma.reviewComment.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: authorSelect } },
    });

    return {
      review: this.mapReviewWithSocial(review, viewerId, !!liked),
      comments,
    };
  }

  async toggleLike(viewerId: string, reviewId: string) {
    const review = await this.getReviewOrThrow(reviewId);
    await this.assertCanViewReview(viewerId, review.userId);

    if (review.userId === viewerId) {
      throw new BadRequestException('Você não pode curtir a própria review');
    }

    const existing = await this.prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId, userId: viewerId } },
    });

    if (existing) {
      await this.prisma.reviewLike.delete({
        where: { reviewId_userId: { reviewId, userId: viewerId } },
      });
    } else {
      await this.prisma.reviewLike.create({
        data: { reviewId, userId: viewerId },
      });
    }

    const likesCount = await this.prisma.reviewLike.count({ where: { reviewId } });

    return { liked: !existing, likesCount };
  }

  async createComment(viewerId: string, reviewId: string, dto: CreateReviewCommentDto) {
    const review = await this.getReviewOrThrow(reviewId);
    await this.assertCanViewReview(viewerId, review.userId);

    if (dto.parentId) {
      const parent = await this.prisma.reviewComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.reviewId !== reviewId) {
        throw new BadRequestException('Comentário pai inválido');
      }
    }

    return this.prisma.reviewComment.create({
      data: {
        text: dto.text.trim(),
        reviewId,
        userId: viewerId,
        parentId: dto.parentId ?? null,
      },
      include: { user: { select: authorSelect } },
    });
  }

  async removeComment(viewerId: string, commentId: string): Promise<void> {
    const comment = await this.prisma.reviewComment.findUnique({
      where: { id: commentId },
      include: { review: true },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado');

    const isAuthor = comment.userId === viewerId;
    const isReviewOwner = comment.review.userId === viewerId;
    if (!isAuthor && !isReviewOwner) {
      throw new ForbiddenException('Acesso negado');
    }

    await this.prisma.reviewComment.delete({ where: { id: commentId } });
  }
}
