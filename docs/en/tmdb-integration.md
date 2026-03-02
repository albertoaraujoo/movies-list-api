# TMDB Integration

## What gets automatically enriched

When a movie is created via `POST /movies`, the API automatically fetches from TMDB:

| Field | TMDB source |
|---|---|
| `director` | `credits.crew` where `job === "Director"` |
| `year` | `release_date` (year extracted) |
| `posterPath` | `poster_path` + configurable base URL |
| `tmdbId` | `id` from the result |

> If TMDB returns no result or is unavailable, the movie is saved anyway with `null` fields. The integration is **non-blocking**.

---

## How to get the Access Token

1. Go to [themoviedb.org](https://www.themoviedb.org) and log in
2. **Settings → API**
3. Copy the **"API Read Access Token"** field (the long token, NOT the short API Key)
4. Set it as `TMDB_ACCESS_TOKEN` in `.env`

> The project uses the Bearer token (v4) in the `Authorization` header, not the v3 API Key as a query param. This prevents the key from appearing in server access logs.

---

## Enrichment flow when creating a movie

```
POST /movies { "title": "Inception" }
  ↓
TmdbService.searchAndEnrich("Inception")
  ↓
GET /search/movie?query=Inception&language=pt-BR
  → takes the first result
  ↓
GET /movie/{tmdbId}?append_to_response=credits
  → extracts: title, director, year, posterPath
  ↓
Saves to database with all fields populated
```

---

## Forcing a specific TMDB movie

If the first result is incorrect, you can specify the ID:

```json
POST /movies
{
  "title": "Batman Begins",
  "tmdbId": 272
}
```

---

## Manual sync

To update data for an already registered movie:

```
POST /movies/:id/sync-tmdb
Body (optional): { "tmdbId": 272 }
```

---

## Configuration variables

| Variable | Default | Description |
|---|---|---|
| `TMDB_ACCESS_TOKEN` | — | Authentication token |
| `TMDB_BASE_URL` | `https://api.themoviedb.org/3` | API base URL |
| `TMDB_IMAGE_URL` | `https://image.tmdb.org/t/p/w500` | Prefix for image URLs |

> `TMDB_IMAGE_URL` defines the poster size. Other available sizes: `w185`, `w342`, `w500`, `w780`, `original`.
