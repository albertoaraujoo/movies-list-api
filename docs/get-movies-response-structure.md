# Estrutura da resposta de GET /movies

Os campos **watched** e **unwatched** vêm junto da resposta de **GET** `/api/v1/movies` (não em GET /users/profile). O interceptor global envolve tudo em `data` + `timestamp` + `path`.

## Exemplo de resposta (estrutura)

```json
{
  "data": {
    "data": [
      {
        "id": "uuid",
        "title": "Nome do filme",
        "director": "...",
        "year": 2024,
        "notes": null,
        "watched": false,
        "tmdbId": 12345,
        "posterPath": "https://...",
        "overview": "...",
        "runtime": 120,
        "userRating": null,
        "watchProvidersBr": { "flatrate": [...], "rent": [...], "buy": [...] },
        "userId": "...",
        "createdAt": "...",
        "updatedAt": "...",
        "drawn": null
      }
    ],
    "meta": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    },
    "watched": [
      { "id": "...", "title": "...", "watched": true, "userRating": 8.5, "..." }
    ],
    "unwatched": [
      { "id": "...", "title": "...", "watched": false, "..." }
    ]
  },
  "timestamp": "2026-03-02T12:00:00.000Z",
  "path": "/api/v1/movies"
}
```

- **`data.data`**: lista paginada (com filtros de query).
- **`data.meta`**: total, página, limit, totalPages.
- **`data.watched`**: todos os filmes do usuário com `watched === true`.
- **`data.unwatched`**: todos os filmes do usuário com `watched === false`.

Cada item em `data`, `watched` e `unwatched` é um objeto **Movie** completo (com `overview`, `runtime`, `watchProvidersBr`, `userRating`, etc.).
