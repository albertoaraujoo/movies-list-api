import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsPositive,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateBy,
} from 'class-validator';

/** Nota do usuário: 0 a 10 em intervalos de 0,5 (0, 0.5, 1, 1.5, ... 10). */
function isRatingStep(value: unknown): boolean {
  if (value == null) return true;
  const n = Number(value);
  if (Number.isNaN(n)) return false;
  return n >= 0 && n <= 10 && Math.round(n * 2) / 2 === n;
}

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  @ValidateBy({
    name: 'ratingStep',
    validator: {
      validate(value: unknown) {
        return isRatingStep(value);
      },
      defaultMessage() {
        return 'userRating must be between 0 and 10 in 0.5 steps (e.g. 0, 0.5, 1, 1.5, ... 10)';
      },
    },
  })
  userRating?: number;
}
