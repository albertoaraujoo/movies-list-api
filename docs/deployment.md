# Deploy — GitHub + Render

## 1. Subir para o GitHub

```bash
cd movie-list-api
git init
git add .
git commit -m "✨ feat: Inicializa API movie-list com NestJS e Prisma"
git remote add origin https://github.com/seu-usuario/movie-list-api.git
git push -u origin main
```

> O `.gitignore` já exclui `.env`, `node_modules/` e `dist/`. Nenhuma credencial será enviada.

---

## 2. Criar o serviço no Render

1. Acesse [render.com](https://render.com) → **New → Web Service**
2. Conecte o repositório GitHub
3. Configure:

| Campo | Valor |
|---|---|
| **Environment** | Node |
| **Build Command** | `npm install && npm run prisma:generate && npm run build` |
| **Start Command** | `npm run prisma:migrate:prod && npm run start:prod` |

---

## 3. Configurar as variáveis de ambiente no Render

Em **Environment → Add Environment Variable**, adicione cada variável:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URI do Supabase com `?sslmode=require` |
| `JWT_SECRET` | Chave aleatória de 32+ chars |
| `JWT_EXPIRES_IN` | `7d` |
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud |
| `TMDB_ACCESS_TOKEN` | Token de leitura da TMDB |
| `TMDB_BASE_URL` | `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_URL` | `https://image.tmdb.org/t/p/w500` |
| `FRONTEND_URL` | URL do seu frontend (ex: `https://meuapp.vercel.app`) |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (padrão do Render) |

---

## 4. Atualizar o Google Cloud Console para produção

Após obter a URL do Render (ex: `https://movie-list-api.onrender.com`):

1. Google Cloud Console → **APIs & Services → Credentials**
2. Edite seu OAuth Client
3. Adicione em **Authorized JavaScript origins:**
   - `https://seu-frontend.vercel.app`
4. Salve

---

## 5. Atualizar CORS no `.env` de produção

Certifique-se que `FRONTEND_URL` aponta para a URL real do frontend no Render:

```env
FRONTEND_URL="https://seu-frontend.vercel.app"
NODE_ENV="production"
```

> Em produção, o CORS só aceita requisições vindas de `FRONTEND_URL`. Qualquer outra origem é bloqueada.

---

## 6. Depois de adicionar novos campos (ex: overview, runtime, watchProvidersBr)

1. **Local:** rode a migration para testar:
   ```bash
   npx prisma migrate dev
   ```
2. **Subir:** faça commit e push das alterações (incluindo `prisma/schema.prisma` e a pasta `prisma/migrations/`).
3. **Render:** o **Start Command** já inclui `npm run prisma:migrate:prod` → ao fazer deploy, as migrations pendentes são aplicadas antes de subir a API. Nada extra para configurar.

---

## Notas importantes

- O comando `prisma migrate deploy` (não `dev`) é usado em produção — ele aplica migrations existentes sem criar novas
- O Render reinicia automaticamente o serviço a cada push no branch configurado
- Certifique-se que o `JWT_SECRET` em produção é diferente do desenvolvimento
