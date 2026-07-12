import { IsUUID } from 'class-validator';

export class ToggleFavoriteDto {
  @IsUUID()
  movieId: string;
}
