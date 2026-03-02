import { Injectable, Logger } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface FindOrCreateUserDto {
  googleId: string;
  email: string;
  name: string;
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
      if (existingUser.name !== data.name || existingUser.email !== data.email) {
        return this.prisma.user.update({
          where: { id: existingUser.id },
          data: { name: data.name, email: data.email },
        });
      }
      return existingUser;
    }

    const newUser = await this.prisma.user.create({ data });
    this.logger.log(`Novo usuário criado: ${newUser.email}`);
    return newUser;
  }
}
