# Setup e Configuração Local

## Pré-requisitos

- Node.js 20+
- npm 10+
- Conta no [Supabase](https://supabase.com) (banco de dados)
- Conta no [Google Cloud Console](https://console.cloud.google.com) (OAuth)
- Conta no [TMDB](https://www.themoviedb.org) (dados dos filmes)

---

## 1. Instalar dependências

```bash
npm install
```

---

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha cada variável no `.env`. Veja a tabela abaixo:

| Variável | Onde obter | Obrigatório |
|---|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → URI | Sim |
| `JWT_SECRET` | Gere com o comando abaixo | Sim |
| `JWT_EXPIRES_IN` | Padrão: `7d` | Não |
| `GOOGLE_CLIENT_ID` | Google Cloud → APIs & Services → Credentials | Sim |
| `TMDB_ACCESS_TOKEN` | TMDB → Settings → API → "API Read Access Token" | Sim |
| `FRONTEND_URL` | URL do seu frontend | Só em produção |

**Gerar JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**ATENÇÃO — Supabase:** se sua senha contém `@`, encode como `%40` na URL:
```
# Senha: @MinhaS3nha
DATABASE_URL="postgresql://postgres:%40MinhaS3nha@db.xxx.supabase.co:5432/postgres?sslmode=require"
```

---

## 3. Criar as tabelas no banco

```bash
npx prisma migrate dev --name init
```

---

## 4. Rodar em desenvolvimento

```bash
npm run start:dev
```

A API estará disponível em: `http://localhost:3000/api/v1`

---

## 5. Inspecionar o banco (opcional)

```bash
npm run prisma:studio
```

Abre uma interface visual em `http://localhost:5555`.

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run start:dev` | Inicia com hot-reload |
| `npm run build` | Compila para produção |
| `npm run start:prod` | Inicia o build compilado |
| `npm run prisma:migrate` | Cria/aplica migrations (dev) |
| `npm run prisma:migrate:prod` | Aplica migrations (produção) |
| `npm run prisma:studio` | Interface visual do banco |
| `npm run prisma:generate` | Regenera o Prisma Client |
