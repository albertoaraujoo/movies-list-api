/** Nomes oficiais TMDB em pt-BR e equivalentes em en-US para dados legados. */
export const TMDB_GENRE_ALIASES: Record<string, string[]> = {
  Ação: ['Ação', 'Action'],
  Aventura: ['Aventura', 'Adventure'],
  Animação: ['Animação', 'Animation'],
  Comédia: ['Comédia', 'Comedy'],
  Crime: ['Crime'],
  Documentário: ['Documentário', 'Documentary'],
  Drama: ['Drama'],
  Família: ['Família', 'Family'],
  Fantasia: ['Fantasia', 'Fantasy'],
  História: ['História', 'History'],
  Terror: ['Terror', 'Horror'],
  Música: ['Música', 'Music'],
  Mistério: ['Mistério', 'Mystery'],
  Romance: ['Romance'],
  'Ficção científica': ['Ficção científica', 'Science Fiction'],
  'Cinema TV': ['Cinema TV', 'TV Movie'],
  Thriller: ['Thriller'],
  Guerra: ['Guerra', 'War'],
  Faroeste: ['Faroeste', 'Western'],
};

export function resolveGenreFilterValues(genre: string): string[] {
  const normalized = genre.trim();
  if (!normalized) return [];

  const aliases = TMDB_GENRE_ALIASES[normalized];
  if (aliases) return [...new Set(aliases)];

  return [normalized];
}
