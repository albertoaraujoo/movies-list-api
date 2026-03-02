import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

interface TmdbSearchMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
}

interface TmdbSearchResponse {
  results: TmdbSearchMovie[];
}

interface TmdbCrewMember {
  job: string;
  name: string;
}

interface TmdbMovieDetailsResponse {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  credits: {
    crew: TmdbCrewMember[];
  };
}

export interface TmdbEnrichedData {
  tmdbId: number;
  title: string;
  director: string | null;
  year: number | null;
  posterPath: string | null;
}

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly baseUrl: string;
  private readonly imageUrl: string;
  private readonly authHeaders: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const accessToken = configService.getOrThrow<string>('TMDB_ACCESS_TOKEN');
    this.baseUrl = configService.get<string>('TMDB_BASE_URL', 'https://api.themoviedb.org/3');
    this.imageUrl = configService.get<string>('TMDB_IMAGE_URL', 'https://image.tmdb.org/t/p/w500');

    // Token enviado no header — nunca exposto em URLs nem logs de acesso
    this.authHeaders = { Authorization: `Bearer ${accessToken}` };
  }

  async searchAndEnrich(title: string, year?: number | null): Promise<TmdbEnrichedData | null> {
    try {
      const params = new URLSearchParams({
        query: title,
        language: 'pt-BR',
        ...(year ? { year: String(year) } : {}),
      });

      const searchResponse = await lastValueFrom(
        this.httpService.get<TmdbSearchResponse>(
          `${this.baseUrl}/search/movie?${params.toString()}`,
          { headers: this.authHeaders },
        ),
      );

      const results = searchResponse.data.results;

      if (!results.length) {
        this.logger.warn(`TMDB: nenhum resultado encontrado para "${title}"`);
        return null;
      }

      return this.getMovieDetails(results[0].id);
    } catch (error) {
      this.logger.warn(`TMDB: falha na busca por "${title}": ${(error as Error).message}`);
      return null;
    }
  }

  async getMovieDetails(tmdbId: number): Promise<TmdbEnrichedData | null> {
    try {
      const params = new URLSearchParams({
        language: 'pt-BR',
        append_to_response: 'credits',
      });

      const response = await lastValueFrom(
        this.httpService.get<TmdbMovieDetailsResponse>(
          `${this.baseUrl}/movie/${tmdbId}?${params.toString()}`,
          { headers: this.authHeaders },
        ),
      );

      const data = response.data;
      const director = data.credits.crew.find((c) => c.job === 'Director')?.name ?? null;
      const year = data.release_date ? new Date(data.release_date).getFullYear() : null;
      const posterPath = data.poster_path ? `${this.imageUrl}${data.poster_path}` : null;

      return { tmdbId: data.id, title: data.title, director, year, posterPath };
    } catch (error) {
      this.logger.warn(`TMDB: falha ao buscar detalhes do ID ${tmdbId}: ${(error as Error).message}`);
      return null;
    }
  }
}
