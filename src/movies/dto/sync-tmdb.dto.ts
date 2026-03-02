import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class SyncTmdbDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  tmdbId?: number;
}
