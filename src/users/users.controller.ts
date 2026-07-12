import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { UpdatePrivacyDto } from './dto/update-username.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { User } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('check-username/:username')
  checkUsername(@Param('username') username: string) {
    return this.usersService.checkUsernameAvailability(username);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('update-username')
  updateUsername(@CurrentUser() user: User, @Body() dto: UpdateUsernameDto) {
    return this.usersService.updateUsername(user.id, dto.username);
  }

  @Put('privacy')
  updatePrivacy(@CurrentUser() user: User, @Body() dto: UpdatePrivacyDto) {
    return this.usersService.updatePrivacy(user.id, dto.privacy);
  }

  @Get('by-username/:username')
  getPublicProfile(
    @CurrentUser() user: User,
    @Param('username') username: string,
  ) {
    return this.usersService.getPublicProfile(username, user.id);
  }

  @Post('follow/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.usersService.follow(user.id, id);
  }

  @Post('unfollow/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.usersService.unfollow(user.id, id);
  }

  @Get(':id/followers')
  getFollowers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getFollowers(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id/following')
  getFollowing(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getFollowing(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
