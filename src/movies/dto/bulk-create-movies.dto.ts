import { IsArray, ArrayMaxSize, ArrayMinSize, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMovieDto } from './create-movie.dto';

export class BulkCreateMoviesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateMovieDto)
  movies: CreateMovieDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  listIds?: string[];
}
