import { IsUUID } from 'class-validator';

export class AddMovieToListDto {
  @IsUUID()
  movieId: string;
}
