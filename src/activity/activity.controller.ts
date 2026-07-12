import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityService } from './activity.service';
import type { User } from '@prisma/client';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  getActivity(
    @CurrentUser() user: User,
    @Query('scope') scope?: 'all' | 'mine' | 'following',
  ) {
    return this.activityService.findForUser(user.id, scope ?? 'all');
  }
}
