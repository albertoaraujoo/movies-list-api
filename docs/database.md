# Banco de Dados

## Tecnologias

- **PostgreSQL** via [Supabase](https://supabase.com)
- **Prisma ORM** para acesso tipado ao banco e migrations

---

## Schema

### `users`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Chave primária |
| `email` | String (único) | Email da conta Google |
| `name` | String | Nome do usuário |
| `googleId` | String (único) | ID da conta Google |
| `createdAt` | DateTime | Data de criação |
| `updatedAt` | DateTime | Data de atualização |

### `movies`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Chave primária |
| `title` | String | Título do filme |
| `director` | String? | Diretor (preenchido via TMDB) |
| `year` | Int? | Ano de lançamento |
| `notes` | String? | Anotações do usuário |
| `watched` | Boolean | Se foi assistido (padrão: `false`) |
| `tmdbId` | Int? | ID do filme na TMDB |
| `posterPath` | String? | URL completa do cartaz |
| `userId` | String (FK) | Dono do filme |

### `drawn_movies`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Chave primária |
| `movieId` | String (FK, único) | Referência ao filme |
| `order` | Int | Posição na fila de sorteados |
| `drawnAt` | DateTime | Data do sorteio |

---

## Relacionamentos

```
User (1) ──── (N) Movie (1) ──── (0..1) DrawnMovie
```

- Um usuário tem muitos filmes
- Um filme pode ter no máximo um registro de sorteio
- `onDelete: Cascade` — deletar usuário deleta seus filmes; deletar filme deleta seu sorteio

---

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. **Settings → Database → Connection string → URI**
3. Copie a URI e adicione `?sslmode=require`:

```
postgresql://postgres:SUA_SENHA@db.xxx.supabase.co:5432/postgres?sslmode=require
```

4. Cole em `DATABASE_URL` no `.env`

---

## Migrations

### Primeira vez (desenvolvimento)
```bash
npx prisma migrate dev --name init
```

### Aplicar em produção (Render)
```bash
npx prisma migrate deploy
```

> O `package.json` já tem o script `prisma:migrate:prod` configurado.

### Após alterar o schema
```bash
npx prisma migrate dev --name descricao-da-mudanca
npx prisma generate
```

---

## Índices

O schema já inclui índices para as queries mais comuns:

```prisma
@@index([userId])           // listagem geral de filmes
@@index([userId, watched])  // filtro por assistidos/não assistidos
```
