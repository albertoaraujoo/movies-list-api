import { IsString, MaxLength, IsOptional, IsDateString } from 'class-validator';

export class UpdateReviewDto {
  @IsString()
  @MaxLength(5000)
  text: string;

  @IsOptional()
  @IsDateString()
  watchedAt?: string;
}
