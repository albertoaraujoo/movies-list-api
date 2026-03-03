# Referência da API

Base URL: `http://localhost:3000/api/v1`

Todas as rotas de `/movies` exigem o header:
```
Authorization: Bearer {accessToken}
```

---

## Formato de resposta padrão

**Sucesso:**
```json
{
  "data": { ... },
  "timestamp": "2026-03-02T10:00:00.000Z",
  "path": "/api/v1/movies"
}
```

**Erro:**
```json
{
  "statusCode": 404,
  "message": "Filme com ID \"xyz\" não encontrado",
  "path": "/api/v1/movies/xyz",
  "timestamp": "2026-03-02T10:00:00.000Z"
}
```

---

## Autenticação

### `POST /auth/google`
Autentica via Google e retorna um JWT da aplicação.

| Campo | Tipo | Descrição |
|---|---|---|
| `idToken` | string | Token ID retornado pelo Google SDK |

---

## Perfil do usuário

Todas as rotas de `/users` exigem: `Authorization: Bearer {accessToken}`.

### `GET /users/profile`
Retorna dados do usuário autenticado e estatísticas da lista de filmes.

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Nome do Usuário",
    "email": "usuario@gmail.com",
    "image": "https://lh3.googleusercontent.com/...",
    "totalMovies": 42,
    "watchedMovies": 17
  },
  "timestamp": "...",
  "path": "/api/v1/users/profile"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id`, `name`, `email`, `image` | — | Dados básicos (avatar do Google em `image`) |
| `totalMovies` | number | Total de filmes na lista do usuário |
| `watchedMovies` | number | Quantidade de filmes com `watched === true` |

---

## Filmes

### `POST /movies`
Cria um novo filme. Busca automaticamente cartaz, diretor e ano na TMDB.

```json
{
  "title": "Inception",
  "notes": "Indicado pelo João",
  "tmdbId": 27205
}
```

> `tmdbId` é opcional. Se informado, usa esse ID específico da TMDB. Caso contrário, busca pelo título.
> A API enriquece via TMDB: `director`, `year`, `posterPath`, `overview`, `runtime` e `watchProvidersBr` (onde assistir/alugar no Brasil).

---

### Objeto Movie (resposta de GET /movies e GET /movies/:id)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id`, `title`, `director`, `year`, `notes`, `watched`, `tmdbId`, `posterPath` | — | Campos já existentes |
| `overview` | string \| null | Sinopse (TMDB) |
| `runtime` | number \| null | Duração em minutos (TMDB) |
| `userRating` | number \| null | Nota do usuário (0 a 10 em intervalos de 0,5: 0, 0.5, 1, … 10). Opcional; comum em filmes assistidos. |
| `watchProvidersBr` | object \| null | Onde assistir no Brasil: `{ link?, flatrate?, rent?, buy? }`. Cada array tem itens `{ logo_path, logoUrl, provider_id, provider_name, display_priority }`. `logoUrl` é a URL completa do ícone (TMDB w92). Dados via JustWatch. |

---

### `GET /movies`
Lista os filmes do usuário com filtros e paginação.

**Query params:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `search` | string | Busca em título, diretor e notas |
| `watched` | boolean | `true` ou `false` |
| `year` | number | Filtrar por ano |
| `director` | string | Filtrar por diretor (parcial) |
| `page` | number | Página (padrão: `1`) |
| `limit` | number | Itens por página (padrão: `20`, máx: `100`) |

**Exemplo:** `GET /movies?search=batman&watched=false&page=1&limit=10`

**Response:** Além da lista paginada e da meta, a resposta inclui duas listas adicionais: `watched` (todos os filmes assistidos do usuário) e `unwatched` (todos os não assistidos).

```json
{
  "data": {
    "data": [ { ...movie } ],
    "meta": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    },
    "watched": [ { ...movie } ],
    "unwatched": [ { ...movie } ]
  }
}
```

---

### `GET /movies/:id`
Retorna um filme específico. Retorna `403` se o filme pertence a outro usuário.

---

### `PATCH /movies/:id`
Atualiza um filme. Todos os campos são opcionais. Inclui `userRating` (0 a 10 em passos de 0,5).

```json
{
  "watched": true,
  "notes": "Assistido em março de 2026",
  "userRating": 8.5
}
```

> Marcar `watched: true` **remove automaticamente** o filme da lista de sorteados.

---

### `DELETE /movies/:id`
Remove o filme permanentemente (cascade apaga o registro em `DrawnMovie`).

---

### `POST /movies/:id/sync-tmdb`
Sincroniza manualmente os dados do filme com a TMDB (cartaz, diretor, ano, sinopse, duração, onde assistir no Brasil).

**Body (opcional):**
```json
{ "tmdbId": 27205 }
```

> Se `tmdbId` não for informado, busca pelo título do filme cadastrado. Atualiza `overview`, `runtime` e `watchProvidersBr`.

---

## Lista de Sorteados

### `POST /movies/draw`
Sorteia um filme aleatório elegível.

**Regras:**
- Somente filmes `watched: false` e não presentes na lista de sorteados são elegíveis
- Limite máximo de **30 filmes** na lista de sorteados por usuário
- Se a lista estiver cheia ou não houver filmes elegíveis → `400 Bad Request`

---

### `GET /movies/drawn`
Retorna a lista de sorteados ordenada por `order` (ordem de inserção).

---

### `POST /movies/drawn/from-tmdb`
Cria um filme a partir da TMDB (mesmo body do POST /movies) e adiciona-o diretamente à lista de sorteados. Útil para incluir na fila de sorteados sem passar pela lista geral.

**Body:** igual ao de criar filme — `title` obrigatório; `tmdbId` ou busca por título/ano.
```json
{ "title": "Inception", "tmdbId": 27205 }
```
ou
```json
{ "title": "Inception", "year": 2010 }
```

**Response `201`:** o registro `DrawnMovie` criado com `movie` incluído (filme já enriquecido pela TMDB). Limite de 30 itens na lista.

---

### `POST /movies/drawn`
Adiciona um filme **já existente** na sua lista à lista de sorteados (ex.: filmes sorteados antes de usar o app). O filme deve ser do usuário e não pode já estar na lista. Limite de 30 itens.

**Body:**
```json
{ "movieId": "uuid-do-filme" }
```

**Response `201`:** o registro `DrawnMovie` criado com `movie` incluído.

---

### `DELETE /movies/drawn/:drawnId`
Remove um item da lista de sorteados pelo ID do registro `DrawnMovie` (`drawnId`).

---

## Códigos de status utilizados

| Código | Significado |
|---|---|
| `200` | Sucesso |
| `201` | Criado |
| `204` | Sem conteúdo (DELETE bem-sucedido) |
| `400` | Requisição inválida (validação ou regra de negócio) |
| `401` | Não autenticado |
| `403` | Acesso negado (recurso de outro usuário) |
| `404` | Não encontrado |
| `429` | Rate limit excedido (100 req/min) |
| `500` | Erro interno do servidor |
