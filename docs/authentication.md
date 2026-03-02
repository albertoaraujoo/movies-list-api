# Autenticação

## Visão Geral

A autenticação é dividida em duas etapas:

1. **Login Social:** O frontend autentica o usuário com o Google e recebe um `idToken`
2. **Token da API:** O backend valida o `idToken` e emite um JWT próprio para uso nas demais rotas

```
Frontend                              Backend
   │                                     │
   │  Usuário clica "Login com Google"   │
   │  → Google SDK retorna idToken       │
   │                                     │
   │── POST /api/v1/auth/google ─────────▶│
   │   { "idToken": "eyJhbG..." }        │
   │                                     │── verifica token no Google
   │                                     │── cria/atualiza usuário no banco
   │◀── { accessToken, user } ───────────│
   │                                     │
   │  Armazena accessToken               │
   │  Envia em todas as requisições:     │
   │  Authorization: Bearer {token}      │
```

---

## Endpoint de autenticação

### `POST /api/v1/auth/google`

Não requer autenticação prévia.

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
      "email": "usuario@gmail.com",
      "name": "Nome do Usuário"
    }
  },
  "timestamp": "2026-03-02T19:00:00.000Z",
  "path": "/api/v1/auth/google"
}
```

---

## Usando o token nas requisições

Todas as rotas de `/movies` exigem o header:

```
Authorization: Bearer {accessToken}
```

---

## Configuração no Frontend (React)

### Instalação

```bash
npm install @react-oauth/google
```

### Configuração

```tsx
// main.tsx ou App.tsx (raiz da aplicação)
import { GoogleOAuthProvider } from '@react-oauth/google'

<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>
```

### Componente de Login

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

## Configuração no Google Cloud Console

1. Acesse **console.cloud.google.com**
2. Menu: **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs**
3. Tipo: **Web application**
4. **Authorized JavaScript origins:**
   - `http://localhost:5173` (dev)
   - `https://seu-frontend.vercel.app` (prod)
5. Copie o **Client ID** e coloque em `GOOGLE_CLIENT_ID` no `.env`

---

## Segurança

- O `idToken` do Google é verificado criptograficamente via `google-auth-library` com `audience` validado
- O JWT emitido pelo backend expira em `JWT_EXPIRES_IN` (padrão: 7 dias)
- O `JWT_SECRET` deve ter no mínimo 32 caracteres e nunca deve ser commitado
- A cada requisição autenticada, o `JwtStrategy` valida o token E consulta o usuário no banco
