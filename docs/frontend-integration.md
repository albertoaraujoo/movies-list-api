# Guia de integração: Backend (movie-list-api) para o Frontend Next.js

Este documento resume o projeto da API e como a documentação foi organizada, para que o frontend Next.js seja construído alinhado ao backend e use a mesma estrutura de docs.

---

## 1. Visão geral do backend

- **Stack:** NestJS, Prisma, PostgreSQL (Supabase), JWT, Google OAuth, TMDB.
- **Base URL em produção:** `https://movies-list-api.onrender.com/api/v1`
- **Base URL em desenvolvimento:** `http://localhost:3000/api/v1`
- **Prefixo global:** todas as rotas começam com `/api/v1`.

---

## 2. Autenticação (fluxo que o front deve implementar)

1. Usuário clica em "Login com Google" no frontend.
2. Frontend usa **Google Sign-In** (ex.: `@react-oauth/google` ou `next-auth` com provider Google) e recebe um **idToken** (JWT do Google).
3. Frontend envia esse idToken para o backend:
   - **POST** `{BASE_URL}/auth/google`
   - **Body:** `{ "idToken": "eyJhbGciOiJSUzI1NiIs..." }`
4. Backend valida o idToken com o Google, cria ou atualiza o usuário no banco e devolve:
   - **accessToken** (JWT da aplicação)
   - **user** `{ id, email, name }`
5. Frontend armazena o **accessToken** (ex.: cookie httpOnly, localStorage ou estado) e envia em **todas** as requisições às rotas protegidas:
   - **Header:** `Authorization: Bearer {accessToken}`

**Resumo:** O front nunca usa JWT_SECRET; só envia o idToken do Google no login e depois usa o accessToken devolvido pelo backend.

---

## 3. Variáveis de ambiente do frontend

O frontend Next.js precisa apenas de:

| Variável | Uso | Onde obter |
|----------|-----|------------|
| `NEXT_PUBLIC_API_URL` | Base URL da API | Em dev: `http://localhost:3000/api/v1`. Em prod: `https://movies-list-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Login com Google no browser | Mesmo Client ID do backend (Google Cloud Console → Credentials → OAuth 2.0 Client ID). Adicionar em "Authorized JavaScript origins" a URL do front (ex.: `http://localhost:3000`, `https://seu-app.vercel.app`) |

O backend já tem `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `DATABASE_URL`, `TMDB_ACCESS_TOKEN` etc.; o front **não** precisa dessas chaves.

---

## 4. Endpoints e uso no frontend

Todas as rotas de filmes exigem: `Authorization: Bearer {accessToken}`.

### 4.1 Autenticação (público)

| Método | Rota | Body | Uso no front |
|--------|------|------|----------------|
| POST | `/auth/google` | `{ idToken: string }` | Chamar após o usuário fazer login com Google; guardar `data.accessToken` e `data.user`. |

### 4.2 Filmes (autenticado)

| Método | Rota | Uso no front |
|--------|------|----------------|
| GET | `/movies` | Listar filmes. Query params: `search`, `watched`, `year`, `director`, `page`, `limit`. |
| POST | `/movies` | Criar filme. Body: `{ title, notes?, tmdbId?, director?, year?, watched? }`. Backend enriquece com TMDB (cartaz, diretor, ano). |
| GET | `/movies/:id` | Detalhe de um filme. |
| PATCH | `/movies/:id` | Atualizar (ex.: `watched`, `notes`). Marcar `watched: true` remove o filme da lista de sorteados. |
| DELETE | `/movies/:id` | Remover filme. |
| POST | `/movies/:id/sync-tmdb` | Re-sincronizar dados do filme com a TMDB. Body opcional: `{ tmdbId? }`. |

### 4.3 Lista de sorteados (autenticado)

| Método | Rota | Uso no front |
|--------|------|----------------|
| POST | `/movies/draw` | Sortear um filme aleatório (não assistido e não já sorteado). Limite de 30 itens na lista. |
| GET | `/movies/drawn` | Listar a fila de sorteados ordenada. |
| DELETE | `/movies/drawn/:drawnId` | Remover um item da lista de sorteados. |

---

## 5. Formato de resposta da API

- **Sucesso:** `{ data: T, timestamp: string, path: string }`.
- **Erro:** `{ statusCode: number, message: string | string[], path: string, timestamp: string }`.

Exemplos de status: 200, 201, 204 (sucesso); 400 (validação/regra de negócio); 401 (não autenticado); 403 (recurso de outro usuário); 404 (não encontrado); 429 (rate limit).

---

## 6. Modelos de dados (espelho do backend)

Para tipagem e UI no Next.js:

**User (retornado no login)**  
`{ id: string, email: string, name: string }`

**Movie**  
`id`, `title`, `director?`, `year?`, `notes?`, `watched`, `tmdbId?`, `posterPath?`, `userId`, `createdAt`, `updatedAt`, e opcionalmente `drawn?: { id, order, drawnAt }`

**Listagem paginada (GET /movies)**  
`{ data: Movie[], meta: { total, page, limit, totalPages } }`

**DrawnMovie (item da lista de sorteados)**  
`id`, `movieId`, `order`, `drawnAt`, `movie: Movie`

**Cartaz:** o campo `posterPath` já vem com URL completa (ex.: `https://image.tmdb.org/t/p/w500/...`). Exibir com `<img src={movie.posterPath} />`.

---

## 7. CORS e produção

O backend em produção aceita apenas a origem definida em `FRONTEND_URL`. No Render, essa variável deve ser a URL do front (ex.: `https://seu-app.vercel.app`). Em desenvolvimento o CORS está aberto.

---

## 8. Como a documentação foi feita neste projeto (replicar no front)

Para o frontend Next.js manter o mesmo padrão de documentação:

### 8.1 Estrutura de pastas

- **`docs/`** — Documentos em **português (PT-BR)**.
- **`docs/en/`** — Mesmos temas em **inglês**.

### 8.2 Temas (arquivos) usados na API

Cada tema em um arquivo separado:

| Arquivo | Conteúdo |
|---------|----------|
| `setup.md` | Instalação, variáveis de ambiente, scripts, primeiro run. |
| `authentication.md` | Fluxo de login (Google → idToken → accessToken), uso do token, exemplo de código. |
| `api-reference.md` | Lista de endpoints, métodos, body/query, exemplos de request/response. |
| `database.md` | Modelos/schema (apenas se o front tiver algo equivalente; senão pode ser "estado e cache"). |
| `tmdb-integration.md` | No backend: enriquecimento via TMDB. No front: só exibir `posterPath` e dados já vindo da API. |
| `deployment.md` | Deploy (ex.: Vercel), variáveis de produção, domínio. |
| `security.md` | Boas práticas (não expor tokens, HTTPS, etc.). |

No front, você pode ter os mesmos nomes em `docs/` e `docs/en/` (ex.: `setup.md`, `authentication.md`, `api-reference.md`) e adaptar o conteúdo ao que o front faz (rotas Next.js, Auth, chamadas à API, etc.).

### 8.3 README principal

- **Breve:** descrição em poucas linhas, quick start (clone, install, env, run).
- **Tabela de documentação:** uma tabela com duas colunas (PT-BR e EN) e linhas por tema, cada célula com link para `docs/arquivo.md` ou `docs/en/arquivo.md`.
- **Seção de endpoints principais:** tabela método + rota + descrição (opcional).
- **Variáveis de ambiente:** referência ao `.env.example` ou lista mínima no README.

Exemplo de tabela no README (igual ao da API):

```markdown
## Documentação
| | 🇧🇷 Português | 🇺🇸 English |
|---|---|---|
| Setup | [docs/setup.md](docs/setup.md) | [docs/en/setup.md](docs/en/setup.md) |
| Autenticação | [docs/authentication.md](docs/authentication.md) | [docs/en/authentication.md](docs/en/authentication.md) |
...
```

### 8.4 Regras aplicadas aqui

- **Um tema = um arquivo** (não um README gigante).
- **Dois idiomas:** mesma estrutura em `docs/` (PT-BR) e `docs/en/` (EN).
- **README enxuto:** resumo + links para a pasta `docs/`.
- **.env.example** com todas as variáveis do front e comentários indicando onde obter cada valor.

---

## 9. Checklist de integração no Next.js

- [ ] Variável `NEXT_PUBLIC_API_URL` apontando para o backend (dev e prod).
- [ ] Variável `NEXT_PUBLIC_GOOGLE_CLIENT_ID` para o botão de login com Google.
- [ ] Tela de login: obter idToken do Google → POST `/auth/google` → guardar accessToken e user.
- [ ] Enviar `Authorization: Bearer {accessToken}` em todas as requisições às rotas `/movies`.
- [ ] Tratar resposta no formato `{ data, timestamp, path }` e erros no formato `{ statusCode, message, path }`.
- [ ] Listagem de filmes com filtros (search, watched, paginação) e exibição de `posterPath`.
- [ ] CRUD de filmes (criar, editar, marcar assistido, excluir).
- [ ] Fluxo de sorteio: POST `/movies/draw`, GET `/movies/drawn`, DELETE `/movies/drawn/:drawnId`.
- [ ] Em produção: backend com `FRONTEND_URL` igual à URL do front; CORS ok.
- [ ] Documentação do front: pasta `docs/` (PT-BR) e `docs/en/` (EN), README com tabela de links, temas alinhados ao que foi feito aqui.

---

## 10. Referência rápida de URLs

| Ambiente | Base URL da API |
|----------|-----------------|
| Desenvolvimento | `http://localhost:3000/api/v1` |
| Produção | `https://movies-list-api.onrender.com/api/v1` |

Documentação completa da API (backend): [api-reference.md](api-reference.md) (PT-BR) e [en/api-reference.md](en/api-reference.md) (EN).
