# Integração com TMDB

## O que é enriquecido automaticamente

Quando um filme é criado via `POST /movies`, a API busca automaticamente na TMDB:

| Campo | Fonte TMDB |
|---|---|
| `director` | `credits.crew` onde `job === "Director"` |
| `year` | `release_date` (ano extraído) |
| `posterPath` | `poster_path` + URL base configurável |
| `tmdbId` | `id` do resultado |

> Se a TMDB não retornar resultado ou estiver indisponível, o filme é salvo mesmo assim com os campos `null`. A integração é **não-bloqueante**.

---

## Como obter o Token de Acesso

1. Acesse [themoviedb.org](https://www.themoviedb.org) e faça login
2. **Settings → API**
3. Copie o campo **"API Read Access Token"** (o token longo, não a API Key curta)
4. Cole em `TMDB_ACCESS_TOKEN` no `.env`

> O projeto usa o token Bearer (v4) no header `Authorization`, não a API Key v3 em query params. Isso evita que a chave apareça em logs de acesso do servidor.

---

## Comportamento ao criar um filme

```
POST /movies { "title": "Inception" }
  ↓
TmdbService.searchAndEnrich("Inception")
  ↓
GET /search/movie?query=Inception&language=pt-BR
  → pega o primeiro resultado
  ↓
GET /movie/{tmdbId}?append_to_response=credits
  → extrai: title, director, year, posterPath
  ↓
Salva no banco com todos os campos preenchidos
```

---

## Forçar um filme específico da TMDB

Se o primeiro resultado não for o correto, você pode especificar o ID:

```json
POST /movies
{
  "title": "Batman Begins",
  "tmdbId": 272
}
```

---

## Sincronização manual

Para atualizar os dados de um filme já cadastrado:

```
POST /movies/:id/sync-tmdb
Body (opcional): { "tmdbId": 272 }
```

---

## Variáveis de configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `TMDB_ACCESS_TOKEN` | — | Token de autenticação |
| `TMDB_BASE_URL` | `https://api.themoviedb.org/3` | URL base da API |
| `TMDB_IMAGE_URL` | `https://image.tmdb.org/t/p/w500` | Prefixo para URLs de imagens |

> O `TMDB_IMAGE_URL` define o tamanho do cartaz. Outros tamanhos disponíveis: `w185`, `w342`, `w500`, `w780`, `original`.
