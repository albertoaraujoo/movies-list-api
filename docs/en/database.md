# Database

## Technologies

- **PostgreSQL** via [Supabase](https://supabase.com)
- **Prisma ORM** for type-safe database access and migrations

---

## Schema

### `users`
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | String (unique) | Google account email |
| `name` | String | User's name |
| `image` | String? | Avatar (Google profile photo URL) |
| `googleId` | String (unique) | Google account ID |
| `createdAt` | DateTime | Creation date |
| `updatedAt` | DateTime | Last updated date |

### `movies`
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | String | Movie title |
| `director` | String? | Director (populated via TMDB) |
| `year` | Int? | Release year |
| `notes` | String? | User notes |
| `watched` | Boolean | Whether it was watched (default: `false`) |
| `tmdbId` | Int? | TMDB movie ID |
| `posterPath` | String? | Full poster URL |
| `overview` | String? | Synopsis (TMDB) |
| `runtime` | Int? | Duration in minutes (TMDB) |
| `watchProvidersBr` | Json? | Where to watch in Brazil: flatrate, rent, buy (JustWatch) |
| `userRating` | Float? | User rating (0 to 10 in 0.5 steps) |
| `userId` | String (FK) | Movie owner |

### `drawn_movies`
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `movieId` | String (FK, unique) | Reference to the movie |
| `order` | Int | Position in the drawn queue |
| `drawnAt` | DateTime | Draw date |

---

## Relationships

```
User (1) ──── (N) Movie (1) ──── (0..1) DrawnMovie
```

- A user has many movies
- A movie can have at most one draw record
- `onDelete: Cascade` — deleting a user deletes their movies; deleting a movie deletes its draw record

---

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. **Settings → Database → Connection string → URI**
3. Copy the URI and append `?sslmode=require`:

```
postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require
```

4. Set it as `DATABASE_URL` in `.env`

---

## Migrations

### First time (development)
```bash
npx prisma migrate dev --name init
```

### Apply in production (Render)
```bash
npx prisma migrate deploy
```

> The `package.json` already has the `prisma:migrate:prod` script configured.

### After changing the schema
```bash
npx prisma migrate dev --name describe-the-change
npx prisma generate
```

---

## Indexes

The schema already includes indexes for the most common queries:

```prisma
@@index([userId])           // general movie listing
@@index([userId, watched])  // filter by watched/unwatched
```
