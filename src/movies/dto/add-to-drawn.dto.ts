import { IsUUID } from 'class-validator';

export class AddToDrawnDto {
  @IsUUID()
  movieId: string;
}
