# Setup & Configuration

## Prerequisites

- Node.js 20+
- npm 10+
- [Supabase](https://supabase.com) account (database)
- [Google Cloud Console](https://console.cloud.google.com) account (OAuth)
- [TMDB](https://www.themoviedb.org) account (movie data)

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in each variable in `.env`:

| Variable | Where to get it | Required |
|---|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → URI | Yes |
| `JWT_SECRET` | Generate with command below | Yes |
| `JWT_EXPIRES_IN` | Default: `7d` | No |
| `GOOGLE_CLIENT_ID` | Google Cloud → APIs & Services → Credentials | Yes |
| `TMDB_ACCESS_TOKEN` | TMDB → Settings → API → "API Read Access Token" | Yes |
| `FRONTEND_URL` | Your frontend URL | Production only |

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**IMPORTANT — Supabase:** if your password contains `@`, encode it as `%40` in the URL:
```
# Password: @MyP4ssword
DATABASE_URL="postgresql://postgres:%40MyP4ssword@db.xxx.supabase.co:5432/postgres?sslmode=require"
```

---

## 3. Create database tables

```bash
npx prisma migrate dev --name init
```

---

## 4. Run in development

```bash
npm run start:dev
```

The API will be available at: `http://localhost:3000/api/v1`

---

## 5. Inspect the database (optional)

```bash
npm run prisma:studio
```

Opens a visual interface at `http://localhost:5555`.

---

## Available scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start with hot-reload |
| `npm run build` | Compile for production |
| `npm run start:prod` | Start the compiled build |
| `npm run prisma:migrate` | Create/apply migrations (dev) |
| `npm run prisma:migrate:prod` | Apply migrations (production) |
| `npm run prisma:studio` | Visual database interface |
| `npm run prisma:generate` | Regenerate Prisma Client |
