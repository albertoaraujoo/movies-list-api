import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { FilterMoviesDto } from './dto/filter-movies.dto';
import { SyncTmdbDto } from './dto/sync-tmdb.dto';
import { AddToDrawnDto } from './dto/add-to-drawn.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('movies')
@UseGuards(JwtAuthGuard)
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() createMovieDto: CreateMovieDto) {
    return this.moviesService.create(user.id, createMovieDto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query() filters: FilterMoviesDto) {
    return this.moviesService.findAll(user.id, filters);
  }

  @Get('drawn')
  getDrawnList(@CurrentUser() user: User) {
    return this.moviesService.getDrawnList(user.id);
  }

  @Post('draw')
  @HttpCode(HttpStatus.CREATED)
  drawMovie(@CurrentUser() user: User) {
    return this.moviesService.drawMovie(user.id);
  }

  @Post('drawn/from-tmdb')
  @HttpCode(HttpStatus.CREATED)
  createMovieAndAddToDrawn(
    @CurrentUser() user: User,
    @Body() createMovieDto: CreateMovieDto,
  ) {
    return this.moviesService.createMovieAndAddToDrawn(user.id, createMovieDto);
  }

  @Post('drawn')
  @HttpCode(HttpStatus.CREATED)
  addToDrawnList(@CurrentUser() user: User, @Body() body: AddToDrawnDto) {
    return this.moviesService.addToDrawnList(user.id, body.movieId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.moviesService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMovieDto: UpdateMovieDto,
  ) {
    return this.moviesService.update(user.id, id, updateMovieDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.moviesService.remove(user.id, id);
  }

  @Post(':id/sync-tmdb')
  syncWithTmdb(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() syncTmdbDto: SyncTmdbDto,
  ) {
    return this.moviesService.syncWithTmdb(user.id, id, syncTmdbDto.tmdbId);
  }

  @Delete('drawn/:drawnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFromDrawnList(
    @CurrentUser() user: User,
    @Param('drawnId', ParseUUIDPipe) drawnId: string,
  ) {
    return this.moviesService.removeFromDrawnList(user.id, drawnId);
  }
}
