# Instruções para o frontend — alterações da API

Use este texto no projeto do frontend (ou no Cursor do front) para aplicar as mudanças necessárias após as últimas atualizações do backend.

---

## Contexto

A API (movie-list-api) foi atualizada com: (1) bloqueio de duplicatas na lista de filmes e na lista de sorteados; (2) novo endpoint para remover duplicatas existentes. O frontend precisa tratar as respostas e expor o botão de deduplicação.

---

## 1. Duplicatas ao adicionar filme

- **POST /movies** (criar filme na lista): se o usuário já tiver o mesmo filme (mesmo `tmdbId` ou mesmo título+ano), a API retorna **400** com mensagem tipo:  
  `"Você já possui este filme na lista. Não é possível adicionar duplicatas."`
- **Ação no front:** ao chamar POST /movies (ou POST /movies/drawn/from-tmdb), tratar **400** e exibir essa mensagem (toast, alerta ou inline) para o usuário, em vez de mensagem genérica de erro.

---

## 2. Adicionar à lista de sorteados direto da TMDB

- **POST /movies/drawn/from-tmdb** — body igual ao de criar filme: `{ title, tmdbId?, year? }`.
- Se o filme **já existir** na lista do usuário, a API **não cria outro**; adiciona o existente à lista de sorteados e retorna 201 com o `DrawnMovie` + `movie`.
- **Ação no front:** onde houver fluxo “adicionar à lista de sorteados a partir da busca TMDB”, usar esta rota. Tratar 201 normalmente (ex.: atualizar lista de sorteados e fechar modal). Se o filme já estava na lista de sorteados, a API pode retornar 400 “Este filme já está na lista de sorteados” — exibir essa mensagem.

---

## 3. Botão “Remover duplicatas”

- **Endpoint:** **POST** `/movies/deduplicate` (com `Authorization: Bearer {accessToken}`).
- **Sem body.** A API varre todos os filmes do usuário, agrupa por `tmdbId` (ou título+ano quando não houver tmdbId), mantém um representante por grupo e **remove os demais**.
- **Resposta 200:** o body vem dentro do envelope padrão (`data`, `timestamp`, `path`). Use `response.data`:

```ts
// Tipo sugerido para a resposta (response.data)
interface DeduplicateResponse {
  removedCount: number;
  groups: Array<{
    kept: Movie;   // filme mantido
    removed: Movie[]; // filmes que foram apagados
  }>;
}
```

- **Ação no front:**
  1. Em configurações, lista de filmes ou perfil, adicionar um botão “Remover duplicatas” (ou “Verificar e remover duplicatas”).
  2. Ao clicar: chamar **POST** `{API_BASE}/movies/deduplicate` com o token.
  3. Se `removedCount === 0`: exibir mensagem tipo “Nenhuma duplicata encontrada.”
  4. Se `removedCount > 0`: exibir mensagem tipo “Foram removidos X filme(s) duplicado(s).” e **atualizar a listagem de filmes** (e a lista de sorteados, se for exibida), pois os itens em `removed` não existem mais.
  5. Tratar 401 (não autenticado) e 500 como nos outros endpoints.

---

## 4. Resumo de endpoints envolvidos

| Método | Rota | Uso |
|--------|------|-----|
| POST | `/movies` | Criar filme. Tratar 400 = duplicata (exibir mensagem da API). |
| POST | `/movies/drawn/from-tmdb` | Adicionar à lista de sorteados via TMDB. Body: `{ title, tmdbId?, year? }`. Tratar 400 se já estiver na lista de sorteados. |
| POST | `/movies/deduplicate` | Remover duplicatas. Sem body. Resposta: `{ removedCount, groups: [{ kept, removed }] }`. Atualizar listagens após sucesso. |

---

## 5. Base URL da API

- Desenvolvimento: `http://localhost:3000/api/v1` (ou a configurada no front).
- Produção: `https://movies-list-api.onrender.com/api/v1`.

Todas as rotas acima exigem header: `Authorization: Bearer {accessToken}`.

---

## 6. Checklist no frontend

- [ ] Tratar 400 em POST /movies e exibir mensagem de duplicata.
- [ ] Usar POST /movies/drawn/from-tmdb no fluxo “adicionar à lista de sorteados pela busca TMDB”; tratar 400 “já está na lista de sorteados”.
- [ ] Adicionar botão “Remover duplicatas” que chama POST /movies/deduplicate.
- [ ] Tipar a resposta de deduplicate (`DeduplicateResponse`) e atualizar listas após sucesso quando `removedCount > 0`.
