import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsPositive,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  director?: string;

  @IsInt()
  @IsOptional()
  @Min(1888)
  @Max(new Date().getFullYear() + 5)
  year?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsBoolean()
  @IsOptional()
  watched?: boolean;

  @IsInt()
  @IsPositive()
  @IsOptional()
  tmdbId?: number;
}
