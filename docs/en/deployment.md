# Deployment — GitHub + Render

## 1. Push to GitHub

```bash
cd movie-list-api
git init
git add .
git commit -m "✨ feat: Initialize movie-list API with NestJS and Prisma"
git remote add origin https://github.com/your-username/movie-list-api.git
git push -u origin main
```

> The `.gitignore` already excludes `.env`, `node_modules/` and `dist/`. No credentials will be pushed.

---

## 2. Create the service on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect the GitHub repository
3. Configure:

| Field | Value |
|---|---|
| **Environment** | Node |
| **Build Command** | `npm install && npm run prisma:generate && npm run build` |
| **Start Command** | `npm run prisma:migrate:prod && npm run start:prod` |

---

## 3. Set environment variables on Render

In **Environment → Add Environment Variable**, add each variable:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase URI with `?sslmode=require` |
| `JWT_SECRET` | Random string of 32+ chars |
| `JWT_EXPIRES_IN` | `7d` |
| `GOOGLE_CLIENT_ID` | Google Cloud Client ID |
| `TMDB_ACCESS_TOKEN` | TMDB read access token |
| `TMDB_BASE_URL` | `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_URL` | `https://image.tmdb.org/t/p/w500` |
| `FRONTEND_URL` | Your frontend URL (e.g. `https://myapp.vercel.app`) |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render's default) |

---

## 4. Update Google Cloud Console for production

After getting the Render URL (e.g. `https://movie-list-api.onrender.com`):

1. Google Cloud Console → **APIs & Services → Credentials**
2. Edit your OAuth Client
3. Add to **Authorized JavaScript origins:**
   - `https://your-frontend.vercel.app`
4. Save

---

## 5. Update CORS for production

Make sure `FRONTEND_URL` points to the real frontend URL:

```env
FRONTEND_URL="https://your-frontend.vercel.app"
NODE_ENV="production"
```

> In production, CORS only accepts requests from `FRONTEND_URL`. Any other origin is blocked.

---

## Important notes

- `prisma migrate deploy` (not `dev`) is used in production — it applies existing migrations without creating new ones
- Render automatically restarts the service on every push to the configured branch
- Make sure the production `JWT_SECRET` is different from the development one
