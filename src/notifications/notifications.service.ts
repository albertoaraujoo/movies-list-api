import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationActor {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  readAt: Date | null;
  createdAt: Date;
  actor: NotificationActor;
  isFollowingActor: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFollowNotification(recipientId: string, actorId: string): Promise<void> {
    if (recipientId === actorId) return;

    await this.prisma.notification.create({
      data: {
        userId: recipientId,
        actorId,
        type: NotificationType.user_followed,
      },
    });
  }

  async findForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const actorIds = [...new Set(rows.map((n) => n.actorId))];
    const followingSet = new Set<string>();

    if (actorIds.length > 0) {
      const following = await this.prisma.userFollow.findMany({
        where: { followerId: userId, followingId: { in: actorIds } },
        select: { followingId: true },
      });
      following.forEach((f) => followingSet.add(f.followingId));
    }

    const data: NotificationItem[] = rows.map((n) => ({
      id: n.id,
      type: n.type,
      readAt: n.readAt,
      createdAt: n.createdAt,
      actor: n.actor,
      isFollowingActor: followingSet.has(n.actorId),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada');

    if (!notification.readAt) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
