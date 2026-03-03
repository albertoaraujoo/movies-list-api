# Integration guide: Backend (movie-list-api) for Next.js frontend

This document summarizes the API project and how its documentation is organized, so the Next.js frontend can align with the backend and reuse the same doc structure.

---

## 1. Backend overview

- **Stack:** NestJS, Prisma, PostgreSQL (Supabase), JWT, Google OAuth, TMDB.
- **Production base URL:** `https://movies-list-api.onrender.com/api/v1`
- **Development base URL:** `http://localhost:3000/api/v1`
- **Global prefix:** all routes start with `/api/v1`.

---

## 2. Authentication (flow the frontend must implement)

1. User clicks "Sign in with Google" on the frontend.
2. Frontend uses **Google Sign-In** (e.g. `@react-oauth/google` or `next-auth` with Google provider) and receives an **idToken** (Google JWT).
3. Frontend sends that idToken to the backend:
   - **POST** `{BASE_URL}/auth/google`
   - **Body:** `{ "idToken": "eyJhbGciOiJSUzI1NiIs..." }`
4. Backend validates the idToken with Google, creates or updates the user in the DB, and returns:
   - **accessToken** (application JWT)
   - **user** `{ id, email, name, image }` (Google avatar in `image`)
5. Frontend stores the **accessToken** (e.g. httpOnly cookie, localStorage, or state) and sends it on **every** request to protected routes:
   - **Header:** `Authorization: Bearer {accessToken}`

**Summary:** The frontend never uses JWT_SECRET; it only sends the Google idToken on login and then uses the accessToken returned by the backend.

---

## 3. Frontend environment variables

The Next.js frontend only needs:

| Variable | Purpose | Where to get it |
|----------|---------|------------------|
| `NEXT_PUBLIC_API_URL` | API base URL | Dev: `http://localhost:3000/api/v1`. Prod: `https://movies-list-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google sign-in in the browser | Same Client ID as the backend (Google Cloud Console → Credentials → OAuth 2.0 Client ID). Add the frontend URL to "Authorized JavaScript origins" (e.g. `http://localhost:3000`, `https://your-app.vercel.app`) |

The backend has `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `DATABASE_URL`, `TMDB_ACCESS_TOKEN`, etc.; the frontend does **not** need those.

---

## 4. Endpoints and frontend usage

All movie routes require: `Authorization: Bearer {accessToken}`.

### 4.1 Authentication (public)

| Method | Route | Body | Frontend usage |
|--------|-------|------|----------------|
| POST | `/auth/google` | `{ idToken: string }` | Call after user signs in with Google; store `data.accessToken` and `data.user`. |

### 4.2 User profile (authenticated)

| Method | Route | Frontend usage |
|--------|-------|----------------|
| GET | `/users/profile` | User data + stats: `{ id, name, email, image, totalMovies, watchedMovies }`. |

### 4.3 Movies (authenticated)

| Method | Route | Frontend usage |
|--------|-------|----------------|
| GET | `/movies` | List movies. Query params: `search`, `watched`, `year`, `director`, `page`, `limit`. |
| POST | `/movies` | Create movie. Body: `{ title, notes?, tmdbId?, director?, year?, watched? }`. Backend enriches with TMDB (poster, director, year, overview, runtime, where to watch in BR). |
| GET | `/movies/:id` | Movie details (includes `overview`, `runtime`, `watchProvidersBr` with `logoUrl` per provider). |
| PATCH | `/movies/:id` | Update (e.g. `watched`, `notes`, `userRating` 0–10 in 0.5 steps). Setting `watched: true` removes the movie from the drawn list. |
| DELETE | `/movies/:id` | Delete movie. |
| POST | `/movies/:id/sync-tmdb` | Re-sync movie data with TMDB (also updates overview, runtime, where to watch). Optional body: `{ tmdbId? }`. |

### 4.4 Drawn list (authenticated)

| Method | Route | Frontend usage |
|--------|-------|----------------|
| POST | `/movies/draw` | Draw a random movie (unwatched and not already drawn). List capped at 30 items. |
| GET | `/movies/drawn` | List the drawn queue in order. |
| POST | `/movies/drawn/from-tmdb` | Create movie via TMDB and add to the drawn list. Body: same as POST /movies (`title`, `tmdbId?`, `year?`). Limit of 30 items. |
| POST | `/movies/drawn` | Add an existing movie from your list to the drawn list. Body: `{ movieId: string }`. Limit of 30 items. |
| DELETE | `/movies/drawn/:drawnId` | Remove an item from the drawn list by the record ID. |

---

## 5. API response format

- **Success:** `{ data: T, timestamp: string, path: string }`.
- **Error:** `{ statusCode: number, message: string | string[], path: string, timestamp: string }`.

Status codes: 200, 201, 204 (success); 400 (validation/business rule); 401 (unauthenticated); 403 (another user's resource); 404 (not found); 429 (rate limit).

---

## 6. Data models (mirror of backend)

For typing and UI in Next.js:

**User (returned on login)**  
`{ id: string, email: string, name: string, image: string | null }`

**Profile (GET /users/profile)**  
`{ id, name, email, image, totalMovies: number, watchedMovies: number }`

**Movie**  
`id`, `title`, `director?`, `year?`, `notes?`, `watched`, `tmdbId?`, `posterPath?`, `overview?`, `runtime?`, `userRating?` (0 to 10 in 0.5 steps), `watchProvidersBr?`, `userId`, `createdAt`, `updatedAt`, and optionally `drawn?: { id, order, drawnAt }`.  
In `watchProvidersBr`: `{ link?, flatrate?, rent?, buy? }`; each array has items with `logo_path`, `logoUrl` (icon URL), `provider_id`, `provider_name`, `display_priority`.

**List (GET /movies)**  
`{ data: Movie[], meta: { total, page, limit, totalPages }, watched: Movie[], unwatched: Movie[] }` — paginated list in `data` (with filters) plus full `watched` (watched) and `unwatched` (unwatched) arrays.

**DrawnMovie (drawn list item)**  
`id`, `movieId`, `order`, `drawnAt`, `movie: Movie`

**Poster:** the `posterPath` field is already a full URL (e.g. `https://image.tmdb.org/t/p/w500/...`). Use `<img src={movie.posterPath} />`.

**Streaming icons:** in `watchProvidersBr.flatrate`, `rent` and `buy`, each provider has `logoUrl` (ready-to-use URL). Use `<img src={provider.logoUrl} alt={provider.provider_name} />`.

---

## 7. CORS and production

In production the backend only allows the origin set in `FRONTEND_URL`. On Render, that variable must be the frontend URL (e.g. `https://your-app.vercel.app`). In development CORS is open.

---

## 8. How documentation was structured in this project (replicate in the frontend)

To keep the same documentation pattern in the Next.js frontend:

### 8.1 Folder structure

- **`docs/`** — Documents in **Portuguese (PT-BR)**.
- **`docs/en/`** — Same topics in **English**.

### 8.2 Topics (files) used in the API

One file per topic:

| File | Content |
|------|---------|
| `setup.md` | Installation, env vars, scripts, first run. |
| `authentication.md` | Login flow (Google → idToken → accessToken), token usage, code examples. |
| `api-reference.md` | List of endpoints, methods, body/query, request/response examples. |
| `database.md` | Models/schema (or, for the front, "state and cache" if applicable). |
| `tmdb-integration.md` | Backend: TMDB enrichment. Frontend: only display `posterPath` and data from the API. |
| `deployment.md` | Deploy (e.g. Vercel), production env vars, domain. |
| `security.md` | Best practices (don’t expose tokens, HTTPS, etc.). |

In the frontend you can use the same file names under `docs/` and `docs/en/` and adapt the content to what the front does (Next.js routes, auth, API calls).

### 8.3 Main README

- **Short:** brief description, quick start (clone, install, env, run).
- **Docs table:** one table with two columns (PT-BR and EN) and one row per topic; each cell links to `docs/file.md` or `docs/en/file.md`.
- **Main endpoints section:** table of method + route + description (optional).
- **Env vars:** reference to `.env.example` or a short list in the README.

Example table (same idea as the API):

```markdown
## Documentation
| | 🇧🇷 Português | 🇺🇸 English |
|---|---|---|
| Setup | [docs/setup.md](docs/setup.md) | [docs/en/setup.md](docs/en/setup.md) |
| Authentication | [docs/authentication.md](docs/authentication.md) | [docs/en/authentication.md](docs/en/authentication.md) |
...
```

### 8.4 Rules used here

- **One topic = one file** (no single huge README).
- **Two languages:** same structure in `docs/` (PT-BR) and `docs/en/` (EN).
- **Lean README:** summary + links to the `docs/` folder.
- **.env.example** with all frontend variables and comments on where to get each value.

---

## 9. Next.js integration checklist

- [ ] `NEXT_PUBLIC_API_URL` pointing to the backend (dev and prod).
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` for the Google sign-in button.
- [ ] Login screen: get Google idToken → POST `/auth/google` → store accessToken and user (includes `image`).
- [ ] Send `Authorization: Bearer {accessToken}` on every request to `/movies` and `/users` routes.
- [ ] Profile: GET `/users/profile` to show name, avatar, total movies and watched count.
- [ ] Handle response shape `{ data, timestamp, path }` and errors `{ statusCode, message, path }`.
- [ ] Movie list with filters (search, watched, pagination) and `posterPath` display.
- [ ] Movie detail page: synopsis (`overview`), runtime (`runtime`), where to watch in Brazil (`watchProvidersBr` with icons via `logoUrl`).
- [ ] Movie CRUD (create, edit, mark watched, delete).
- [ ] Draw flow: POST `/movies/draw`, GET `/movies/drawn`, DELETE `/movies/drawn/:drawnId`.
- [ ] In production: backend `FRONTEND_URL` set to the frontend URL; CORS correct.
- [ ] Frontend docs: `docs/` (PT-BR) and `docs/en/` (EN), README with doc table, topics aligned with this project.

---

## 10. Quick URL reference

| Environment | API base URL |
|-------------|--------------|
| Development | `http://localhost:3000/api/v1` |
| Production | `https://movies-list-api.onrender.com/api/v1` |

Full API reference: [api-reference.md](api-reference.md) (EN in this folder).
