import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import type { User } from '@prisma/client';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('watched')
  findWatched(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findWatched(
      user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('public/:username')
  findPublicByUsername(
    @CurrentUser() user: User,
    @Param('username') username: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findPublicByUsername(
      user.id,
      username,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('movie/:movieId')
  findByMovie(
    @CurrentUser() user: User,
    @Param('movieId', ParseUUIDPipe) movieId: string,
  ) {
    return this.reviewsService.findByMovieId(user.id, movieId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeComment(
    @CurrentUser() user: User,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    await this.reviewsService.removeComment(user.id, commentId);
  }

  @Get(':id/thread')
  getThread(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.getThread(user.id, id);
  }

  @Post(':id/likes')
  @HttpCode(HttpStatus.OK)
  toggleLike(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.toggleLike(user.id, id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewCommentDto,
  ) {
    return this.reviewsService.createComment(user.id, id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.reviewsService.remove(user.id, id);
  }
}
