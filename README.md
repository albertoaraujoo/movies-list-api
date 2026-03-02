# movie-list-api

REST API for personal movie list management with random draw feature.

**Stack:** NestJS · Prisma · PostgreSQL (Supabase) · JWT · Google OAuth · TMDB

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## Quick start

```bash
npm install
cp .env.example .env   # fill in the variables
npx prisma migrate dev --name init
npm run start:dev
```

API available at `http://localhost:3000/api/v1`.

---

## Documentation

| | 🇧🇷 Português | 🇺🇸 English |
|---|---|---|
| Setup & Configuration | [docs/setup.md](docs/setup.md) | [docs/en/setup.md](docs/en/setup.md) |
| Authentication | [docs/authentication.md](docs/authentication.md) | [docs/en/authentication.md](docs/en/authentication.md) |
| API Reference | [docs/api-reference.md](docs/api-reference.md) | [docs/en/api-reference.md](docs/en/api-reference.md) |
| Database | [docs/database.md](docs/database.md) | [docs/en/database.md](docs/en/database.md) |
| TMDB Integration | [docs/tmdb-integration.md](docs/tmdb-integration.md) | [docs/en/tmdb-integration.md](docs/en/tmdb-integration.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) | [docs/en/deployment.md](docs/en/deployment.md) |
| Security | [docs/security.md](docs/security.md) | [docs/en/security.md](docs/en/security.md) |

---

## Main endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/google` | Sign in with Google |
| `GET` | `/movies` | List movies with filters |
| `POST` | `/movies` | Create movie (auto-enriched via TMDB) |
| `PATCH` | `/movies/:id` | Update movie |
| `DELETE` | `/movies/:id` | Remove movie |
| `POST` | `/movies/draw` | Draw a random movie |
| `GET` | `/movies/drawn` | View drawn list |
| `POST` | `/movies/:id/sync-tmdb` | Sync data with TMDB |

> All `/movies` routes require `Authorization: Bearer {token}`.

---

## Required environment variables

See [`.env.example`](.env.example) for the full list with instructions on where to find each value.
