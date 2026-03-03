# Atualização para o frontend: página do filme e ícones de streamings

Este documento descreve as mudanças na API relacionadas à **página do filme**: sinopse, duração, onde assistir no Brasil e **ícones dos streamings** (URL pronta para uso).

---

## 1. Novos campos no objeto `Movie`

Em **GET /movies**, **GET /movies/:id**, e nas respostas de **POST /movies**, **PATCH /movies/:id** e **POST /movies/:id/sync-tmdb**, o filme passa a incluir:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `overview` | `string \| null` | Sinopse do filme (TMDB). |
| `runtime` | `number \| null` | Duração em **minutos** (TMDB). |
| `watchProvidersBr` | `WatchProvidersBr \| null` | Onde assistir/alugar/comprar no Brasil. Ver estrutura abaixo. |

Filmes antigos ou sem dados TMDB podem vir com esses campos em `null`. O front pode oferecer “Sincronizar com TMDB” (POST `/api/v1/movies/:id/sync-tmdb`) para preencher.

---

## 2. Estrutura de `watchProvidersBr`

```ts
interface WatchProvider {
  logo_path: string | null;   // path relativo TMDB
  logoUrl?: string;          // URL completa do ícone (pronta para <img src>)
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

interface WatchProvidersBr {
  link?: string;             // URL da página TMDB "Onde assistir"
  flatrate?: WatchProvider[];  // Streaming (Netflix, Prime, Disney+ etc.)
  rent?: WatchProvider[];      // Aluguel
  buy?: WatchProvider[];        // Compra
}
```

- **`logoUrl`**: a API já retorna a URL completa do ícone (base TMDB `w92`). Use direto em `<img src={provider.logoUrl} alt={provider.provider_name} />`.
- **`flatrate`**: assinaturas de streaming.
- **`rent`**: onde alugar.
- **`buy`**: onde comprar.

Dados de disponibilidade via **JustWatch**; exiba atribuição “Dados: JustWatch” se mostrar “onde assistir”.

---

## 3. O que implementar no frontend

1. **Tipos**  
   Atualize o tipo do filme com `overview`, `runtime` e `watchProvidersBr` (e o tipo `WatchProvider` com `logoUrl` opcional).

2. **Página do filme**  
   - **Sinopse:** exibir `overview` (fallback quando `null`).  
   - **Duração:** exibir `runtime` formatado (ex.: “2h 28min”).  
   - **Onde assistir:**  
     - Seção “Streaming” com `watchProvidersBr.flatrate` (ícone + nome).  
     - Seção “Aluguel” com `watchProvidersBr.rent`.  
     - Seção “Compra” com `watchProvidersBr.buy`.  
   - **Ícones:** usar `provider.logoUrl` no `src` da imagem. Ex.:  
     `<img src={provider.logoUrl} alt={provider.provider_name} />`

3. **Fallback**  
   Se `overview`, `runtime` ou `watchProvidersBr` forem `null`, mostrar “Dados não disponíveis” ou botão “Sincronizar com TMDB”.

---

## 4. Resumo

| Recurso | Campo / origem | Uso no front |
|--------|----------------|--------------|
| Sinopse | `movie.overview` | Texto na página do filme |
| Duração | `movie.runtime` (min) | Formatar como “Xh Ymin” |
| Streaming (BR) | `movie.watchProvidersBr.flatrate` | Lista com ícone + nome |
| Aluguel (BR) | `movie.watchProvidersBr.rent` | Lista com ícone + nome |
| Compra (BR) | `movie.watchProvidersBr.buy` | Lista com ícone + nome |
| Ícone do provider | `provider.logoUrl` | `<img src={provider.logoUrl} />` |

Nenhuma variável de ambiente nova no frontend; a base das imagens (TMDB) já está embutida em `logoUrl` na resposta da API.
