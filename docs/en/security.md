# Security

## Implemented security layers

### 1. Helmet — HTTP security headers
The `helmet` middleware is applied globally in `main.ts`. It automatically configures:

- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — enforces HTTPS
- `X-XSS-Protection` — extra layer against XSS
- `Content-Security-Policy` — restricts loadable resources

---

### 2. CORS configured per environment

| Environment | Behavior |
|---|---|
| `development` | Accepts any origin (`true`) |
| `production` | Accepts **only** the origin defined in `FRONTEND_URL` |

---

### 3. Rate Limiting — global ThrottlerGuard
Limit of **100 requests per minute** per IP applied to all routes.

---

### 4. Input validation — global ValidationPipe
- `whitelist: true` — strips fields not declared in DTOs
- `forbidNonWhitelisted: true` — rejects requests with extra fields
- `transform: true` — automatically converts types

---

### 5. JWT Authentication
- Token verified on every request via `JwtStrategy`
- User queried from the database on every request (invalidates tokens of deleted users)
- `ignoreExpiration: false` — expired tokens are rejected

---

### 6. Resource-level authorization
All movie access validates `movie.userId === currentUser.id`. Attempting to access another user's resource returns `403 Forbidden`.

---

### 7. TMDB token via Bearer header
The `TMDB_ACCESS_TOKEN` is sent in the `Authorization: Bearer` header, never as a query parameter. This ensures the key **never appears in server or proxy access logs**.

---

### 8. Error handling without information leakage
The `AllExceptionsFilter` catches **all** exceptions (including non-HTTP internal errors). In production, `500` errors return only `"Internal server error"` — stack traces and database messages never reach the client.

---

### 9. Environment variable validation at startup
`ConfigModule` with Joi validates all required env vars at startup. The application **refuses to start** if any variable is missing or has an invalid format.

---

## What NOT to commit

| File | Reason |
|---|---|
| `.env` | Contains all real credentials |
| `node_modules/` | Dependencies |
| `dist/` | Compiled build |

The `.gitignore` already protects all these files.

---

## Pre-deploy checklist

- [ ] `.env` with real values exists locally but is **not in git**
- [ ] `JWT_SECRET` has 32+ random characters
- [ ] Production `JWT_SECRET` is **different** from development
- [ ] `FRONTEND_URL` points to the real frontend URL
- [ ] `NODE_ENV=production` is set on Render
- [ ] TMDB token was regenerated after accidental exposure
- [ ] Google Cloud Console has production origins authorized
