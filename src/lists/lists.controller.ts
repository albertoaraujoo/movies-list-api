import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { AddMovieToListDto } from './dto/add-movie-to-list.dto';
import { ReorderListDto } from './dto/reorder-list.dto';
import type { User } from '@prisma/client';

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: CreateListDto) {
    return this.listsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.listsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.listsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.listsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    await this.listsService.remove(user.id, id);
  }

  @Post(':id/movies')
  @HttpCode(HttpStatus.CREATED)
  addMovie(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMovieToListDto,
  ) {
    return this.listsService.addMovie(user.id, id, dto.movieId);
  }

  @Delete(':id/movies/:movieId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMovie(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('movieId', ParseUUIDPipe) movieId: string,
  ) {
    await this.listsService.removeMovie(user.id, id, movieId);
  }

  @Patch(':id/reorder')
  reorder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderListDto,
  ) {
    return this.listsService.reorder(user.id, id, dto.movieIds);
  }
}
