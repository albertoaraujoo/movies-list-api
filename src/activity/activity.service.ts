import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string,
    type: ActivityType,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.activityLog.create({
      data: { userId, type, metadata },
    });
  }

  async findForUser(
    userId: string,
    scope: 'all' | 'mine' | 'following' = 'all',
    limit = 50,
  ) {
    let userIds: string[] = [userId];

    if (scope === 'following' || scope === 'all') {
      const following = await this.prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);
      if (scope === 'following') {
        userIds = followingIds;
      } else {
        userIds = [...new Set([userId, ...followingIds])];
      }
    } else {
      userIds = [userId];
    }

    if (userIds.length === 0) {
      return { mine: [], following: [] };
    }

    const activities = await this.prisma.activityLog.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
    });

    const mine = activities.filter((a) => a.userId === userId);
    const followingActivities = activities.filter((a) => a.userId !== userId);

    return { mine, following: followingActivities };
  }
}
