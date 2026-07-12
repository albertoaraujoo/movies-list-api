import { IsString, IsOptional, IsUUID, MaxLength, IsDateString } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  movieId: string;

  @IsString()
  @MaxLength(5000)
  text: string;

  @IsOptional()
  @IsDateString()
  watchedAt?: string;
}
