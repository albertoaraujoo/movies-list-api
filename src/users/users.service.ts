import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  totalMovies: number;
  watchedMovies: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
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
            name: data.name,
            email: data.email,
            ...(data.image !== undefined && { image: data.image }),
          },
        });
      }
      return existingUser;
    }

    const newUser = await this.prisma.user.create({ data });
    this.logger.log(`Novo usuário criado: ${newUser.email}`);
    return newUser;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const [user, totalMovies, watchedMovies] = await this.prisma.$transaction([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      }),
      this.prisma.movie.count({ where: { userId } }),
      this.prisma.movie.count({ where: { userId, watched: true } }),
    ]);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return { ...user, totalMovies, watchedMovies };
  }
}
