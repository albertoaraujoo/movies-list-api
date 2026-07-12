import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ProfilePrivacy, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isValidUsername, normalizeUsername } from '../common/utils/username.util';

interface FindOrCreateUserDto {
  googleId: string;
  email: string;
  name: string;
  image?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
  privacy: ProfilePrivacy;
  usernameUpdatedAt: Date | null;
  nameEditedAt: Date | null;
  canChangeUsername: boolean;
  daysUntilUsernameChange: number;
  totalMovies: number;
  watchedMovies: number;
  listsCount: number;
  followersCount: number;
  followingCount: number;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  image: string | null;
  username: string;
  privacy: ProfilePrivacy;
  watchedMovies: number;
  listsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isMutual?: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly usernameChangeCooldownDays = 30;

  constructor(private readonly prisma: PrismaService) {}

  private getUsernameChangeStatus(user: {
    username: string | null;
    usernameUpdatedAt: Date | null;
  }): { canChangeUsername: boolean; daysUntilUsernameChange: number } {
    if (!user.username) {
      return { canChangeUsername: true, daysUntilUsernameChange: 0 };
    }

    if (!user.usernameUpdatedAt) {
      return { canChangeUsername: true, daysUntilUsernameChange: 0 };
    }

    const elapsedMs = Date.now() - user.usernameUpdatedAt.getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    if (elapsedDays >= this.usernameChangeCooldownDays) {
      return { canChangeUsername: true, daysUntilUsernameChange: 0 };
    }

    return {
      canChangeUsername: false,
      daysUntilUsernameChange: this.usernameChangeCooldownDays - elapsedDays,
    };
  }

  private assertCanChangeUsername(user: User, nextUsername: string): void {
    const normalized = normalizeUsername(nextUsername);
    if (user.username === normalized) return;

    if (!user.username) return;

    const { canChangeUsername, daysUntilUsernameChange } =
      this.getUsernameChangeStatus(user);

    if (!canChangeUsername) {
      throw new BadRequestException(
        `Você só pode alterar o username após ${this.usernameChangeCooldownDays} dias. Aguarde mais ${daysUntilUsernameChange} dia(s).`,
      );
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
    });
  }

  async findOrCreate(data: FindOrCreateUserDto): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { googleId: data.googleId },
    });

    if (existingUser) {
      const hasChanges =
        existingUser.name !== data.name ||
        existingUser.email !== data.email ||
        (data.image !== undefined && existingUser.image !== data.image);

      if (hasChanges) {
        return this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: data.email,
            ...(data.image !== undefined && { image: data.image }),
            ...(existingUser.nameEditedAt == null && { name: data.name }),
          },
        });
      }
      return existingUser;
    }

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });
      await tx.movieList.create({
        data: {
          name: 'Minha Lista',
          description: 'Lista principal de filmes',
          isDefault: true,
          userId: user.id,
        },
      });
      await tx.movieList.create({
        data: {
          name: 'Favoritos',
          description: 'Filmes favoritos',
          isFavorites: true,
          userId: user.id,
        },
      });
      return user;
    });

    this.logger.log(`Novo usuário criado: ${newUser.email}`);
    return newUser;
  }

  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      return { available: false };
    }
    const existing = await this.prisma.user.findUnique({
      where: { username: normalized },
    });
    return { available: !existing };
  }

  async updateUsername(userId: string, username: string): Promise<UserProfile> {
    return this.updateProfile(userId, { username });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; username?: string },
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const updateData: {
      name?: string;
      nameEditedAt?: Date;
      username?: string;
      usernameUpdatedAt?: Date;
    } = {};

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Nome não pode ser vazio');
      }
      if (trimmed !== user.name) {
        updateData.name = trimmed;
        updateData.nameEditedAt = new Date();
      }
    }

    if (data.username !== undefined) {
      const normalized = normalizeUsername(data.username);
      if (!isValidUsername(normalized)) {
        throw new BadRequestException(
          'Username deve ter 3-20 caracteres: letras minúsculas, números e underscore.',
        );
      }

      if (normalized !== user.username) {
        this.assertCanChangeUsername(user, normalized);

        const existing = await this.prisma.user.findUnique({
          where: { username: normalized },
        });
        if (existing && existing.id !== userId) {
          throw new ConflictException('Username já está em uso');
        }

        updateData.username = normalized;
        updateData.usernameUpdatedAt = new Date();
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return this.getProfile(userId);
  }

  async updatePrivacy(userId: string, privacy: ProfilePrivacy): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { privacy },
    });
  }

  async isMutualFollow(userA: string, userB: string): Promise<boolean> {
    const [aFollowsB, bFollowsA] = await this.prisma.$transaction([
      this.prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: userA, followingId: userB } },
      }),
      this.prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: userB, followingId: userA } },
      }),
    ]);
    return !!aFollowsB && !!bFollowsA;
  }

  async canViewProfile(viewerId: string | null, targetUserId: string): Promise<boolean> {
    if (!viewerId) return false;
    if (viewerId === targetUserId) return true;

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) return false;

    if (target.privacy === ProfilePrivacy.public) return true;
    if (target.privacy === ProfilePrivacy.private) return false;
    if (target.privacy === ProfilePrivacy.friends) {
      return this.isMutualFollow(viewerId, targetUserId);
    }
    return false;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const [user, totalMovies, watchedMovies, listsCount, followersCount, followingCount] =
      await this.prisma.$transaction([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            username: true,
            privacy: true,
            usernameUpdatedAt: true,
            nameEditedAt: true,
          },
        }),
        this.prisma.movie.count({ where: { userId } }),
        this.prisma.movie.count({ where: { userId, watched: true } }),
        this.prisma.movieList.count({ where: { userId } }),
        this.prisma.userFollow.count({ where: { followingId: userId } }),
        this.prisma.userFollow.count({ where: { followerId: userId } }),
      ]);

    if (!user) throw new NotFoundException('Usuário não encontrado');

    const usernameStatus = this.getUsernameChangeStatus(user);

    return {
      ...user,
      ...usernameStatus,
      totalMovies,
      watchedMovies,
      listsCount,
      followersCount,
      followingCount,
    };
  }

  async getPublicProfile(
    username: string,
    viewerId: string | null,
  ): Promise<PublicUserProfile> {
    const user = await this.findByUsername(username);
    if (!user || !user.username) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const canView = await this.canViewProfile(viewerId, user.id);
    if (!canView) {
      throw new ForbiddenException('Este perfil é privado');
    }

    const [watchedMovies, listsCount, followersCount, followingCount] =
      await this.prisma.$transaction([
        this.prisma.movie.count({ where: { userId: user.id, watched: true } }),
        this.prisma.movieList.count({ where: { userId: user.id } }),
        this.prisma.userFollow.count({ where: { followingId: user.id } }),
        this.prisma.userFollow.count({ where: { followerId: user.id } }),
      ]);

    let isFollowing = false;
    let isMutual = false;
    if (viewerId && viewerId !== user.id) {
      isFollowing = !!(await this.prisma.userFollow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: user.id },
        },
      }));
      isMutual = await this.isMutualFollow(viewerId, user.id);
    }

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      username: user.username,
      privacy: user.privacy,
      watchedMovies,
      listsCount,
      followersCount,
      followingCount,
      isFollowing,
      isMutual,
    };
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('Você não pode seguir a si mesmo');
    }

    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('Usuário não encontrado');

    const existing = await this.prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) throw new BadRequestException('Você já segue este usuário');

    await this.prisma.userFollow.create({ data: { followerId, followingId } });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const existing = await this.prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing) throw new NotFoundException('Você não segue este usuário');
    await this.prisma.userFollow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
  }

  async getFollowers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { followingId: userId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userFollow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      }),
      this.prisma.userFollow.count({ where }),
    ]);

    return {
      data: data.map((f) => f.follower),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { followerId: userId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userFollow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      }),
      this.prisma.userFollow.count({ where }),
    ]);

    return {
      data: data.map((f) => f.following),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
