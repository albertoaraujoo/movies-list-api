# API Reference

Base URL: `http://localhost:3000/api/v1`

All `/movies` routes require the header:
```
Authorization: Bearer {accessToken}
```

---

## Standard response format

**Success:**
```json
{
  "data": { ... },
  "timestamp": "2026-03-02T10:00:00.000Z",
  "path": "/api/v1/movies"
}
```

**Error:**
```json
{
  "statusCode": 404,
  "message": "Movie with ID \"xyz\" not found",
  "path": "/api/v1/movies/xyz",
  "timestamp": "2026-03-02T10:00:00.000Z"
}
```

---

## Authentication

### `POST /auth/google`
Authenticates via Google and returns an application JWT.

| Field | Type | Description |
|---|---|---|
| `idToken` | string | ID token returned by the Google SDK |

---

## User profile

All `/users` routes require: `Authorization: Bearer {accessToken}`.

### `GET /users/profile`
Returns the authenticated user's data and movie list statistics.

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@gmail.com",
    "image": "https://lh3.googleusercontent.com/...",
    "totalMovies": 42,
    "watchedMovies": 17
  },
  "timestamp": "...",
  "path": "/api/v1/users/profile"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id`, `name`, `email`, `image` | — | Basic data (Google avatar in `image`) |
| `totalMovies` | number | Total movies in the user's list |
| `watchedMovies` | number | Count of movies with `watched === true` |

---

## Movies

### `POST /movies`
Creates a new movie. Automatically fetches poster, director, year, overview, runtime and watch providers (Brazil) from TMDB.

```json
{
  "title": "Inception",
  "notes": "Recommended by John",
  "tmdbId": 27205
}
```

> `tmdbId` is optional. If provided, uses that specific TMDB ID. Otherwise, searches by title.
> API enriches via TMDB: `director`, `year`, `posterPath`, `overview`, `runtime`, `watchProvidersBr` (where to watch/rent in Brazil).

---

### Movie object (GET /movies and GET /movies/:id)

| Field | Type | Description |
|-------|------|-------------|
| `id`, `title`, `director`, `year`, `notes`, `watched`, `tmdbId`, `posterPath` | — | Existing fields |
| `overview` | string \| null | Synopsis (TMDB) |
| `runtime` | number \| null | Duration in minutes (TMDB) |
| `watchProvidersBr` | object \| null | Where to watch in Brazil: `{ link?, flatrate?, rent?, buy? }`. Each array has items `{ logo_path, logoUrl, provider_id, provider_name, display_priority }`. `logoUrl` is the full icon URL (TMDB w92). Data via JustWatch. |

---

### `GET /movies`
Lists the user's movies with filters and pagination.

**Query params:**

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Search in title, director and notes |
| `watched` | boolean | `true` or `false` |
| `year` | number | Filter by year |
| `director` | string | Filter by director (partial match) |
| `page` | number | Page number (default: `1`) |
| `limit` | number | Items per page (default: `20`, max: `100`) |

**Example:** `GET /movies?search=batman&watched=false&page=1&limit=10`

**Response:**
```json
{
  "data": {
    "data": [ { ...movie } ],
    "meta": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### `GET /movies/:id`
Returns a specific movie. Returns `403` if the movie belongs to another user.

---

### `PATCH /movies/:id`
Updates a movie. All fields are optional.

```json
{
  "watched": true,
  "notes": "Watched in March 2026"
}
```

> Setting `watched: true` **automatically removes** the movie from the drawn list.

---

### `DELETE /movies/:id`
Permanently removes the movie (cascade deletes the `DrawnMovie` record).

---

### `POST /movies/:id/sync-tmdb`
Manually syncs the movie data with TMDB (poster, director, year, overview, runtime, where to watch in Brazil).

**Body (optional):**
```json
{ "tmdbId": 27205 }
```

> If `tmdbId` is not provided, searches by the movie's existing title. Updates `overview`, `runtime` and `watchProvidersBr`.

---

## Drawn List

### `POST /movies/draw`
Draws a random eligible movie.

**Rules:**
- Only `watched: false` movies not already in the drawn list are eligible
- Maximum of **30 movies** in the drawn list per user
- If the list is full or no eligible movies exist → `400 Bad Request`

---

### `GET /movies/drawn`
Returns the drawn list ordered by `order` (insertion order).

---

### `DELETE /movies/drawn/:drawnId`
Removes an item from the drawn list by its `DrawnMovie` record ID.

---

## HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `204` | No content (successful DELETE) |
| `400` | Bad request (validation or business rule) |
| `401` | Unauthenticated |
| `403` | Forbidden (resource belongs to another user) |
| `404` | Not found |
| `429` | Rate limit exceeded (100 req/min) |
| `500` | Internal server error |
