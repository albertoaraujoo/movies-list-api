import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { TmdbModule } from '../tmdb/tmdb.module';
import { ListsModule } from '../lists/lists.module';

@Module({
  imports: [TmdbModule, ListsModule],
  controllers: [MoviesController],
  providers: [MoviesService],
})
export class MoviesModule {}
