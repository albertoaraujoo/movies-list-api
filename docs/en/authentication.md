# Authentication

## Overview

Authentication is split into two steps:

1. **Social Login:** The frontend authenticates the user with Google and receives an `idToken`
2. **API Token:** The backend validates the `idToken` and issues its own JWT for all subsequent requests

```
Frontend                              Backend
   │                                     │
   │  User clicks "Sign in with Google"  │
   │  → Google SDK returns idToken       │
   │                                     │
   │── POST /api/v1/auth/google ─────────▶│
   │   { "idToken": "eyJhbG..." }        │
   │                                     │── verifies token with Google
   │                                     │── creates/updates user in DB
   │◀── { accessToken, user } ───────────│
   │                                     │
   │  Stores accessToken                 │
   │  Sends in every request:            │
   │  Authorization: Bearer {token}      │
```

---

## Authentication endpoint

### `POST /api/v1/auth/google`

No prior authentication required.

**Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@gmail.com",
      "name": "User Name",
      "image": "https://lh3.googleusercontent.com/..."
    }
  },
  "timestamp": "2026-03-02T19:00:00.000Z",
  "path": "/api/v1/auth/google"
}
```

---

## Using the token in requests

All `/movies` routes require the header:

```
Authorization: Bearer {accessToken}
```

---

## Frontend setup (React)

### Install

```bash
npm install @react-oauth/google
```

### Provider setup

```tsx
// main.tsx or App.tsx (app root)
import { GoogleOAuthProvider } from '@react-oauth/google'

<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>
```

### Login component

```tsx
import { GoogleLogin } from '@react-oauth/google'

function LoginButton() {
  const handleSuccess = async (response) => {
    const res = await fetch('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential }),
    })

    const { data } = await res.json()
    localStorage.setItem('accessToken', data.accessToken)
  }

  return <GoogleLogin onSuccess={handleSuccess} />
}
```

---

## Google Cloud Console setup

1. Go to **console.cloud.google.com**
2. Menu: **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs**
3. Type: **Web application**
4. **Authorized JavaScript origins:**
   - `http://localhost:5173` (dev)
   - `https://your-frontend.vercel.app` (prod)
5. Copy the **Client ID** and set it as `GOOGLE_CLIENT_ID` in `.env`

---

## Security

- The Google `idToken` is cryptographically verified via `google-auth-library` with `audience` validation
- The JWT issued by the backend expires after `JWT_EXPIRES_IN` (default: 7 days)
- `JWT_SECRET` must be at least 32 characters and must never be committed to git
- On every authenticated request, `JwtStrategy` validates the token AND queries the user from the database
