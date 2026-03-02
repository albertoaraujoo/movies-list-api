# Segurança

## Camadas de proteção implementadas

### 1. Helmet — Headers HTTP de segurança
O middleware `helmet` é aplicado globalmente no `main.ts`. Ele configura automaticamente:

- `X-Frame-Options: DENY` — previne clickjacking
- `X-Content-Type-Options: nosniff` — previne MIME sniffing
- `Strict-Transport-Security` — força HTTPS
- `X-XSS-Protection` — camada extra contra XSS
- `Content-Security-Policy` — restringe recursos carregáveis

---

### 2. CORS configurado por ambiente

| Ambiente | Comportamento |
|---|---|
| `development` | Aceita qualquer origem (`true`) |
| `production` | Aceita **somente** a origem definida em `FRONTEND_URL` |

---

### 3. Rate Limiting — ThrottlerGuard global
Limite de **100 requisições por minuto** por IP aplicado em todas as rotas.

---

### 4. Validação de entrada — ValidationPipe global
- `whitelist: true` — remove campos não declarados nos DTOs
- `forbidNonWhitelisted: true` — rejeita requisições com campos extras
- `transform: true` — converte tipos automaticamente

---

### 5. Autenticação JWT
- Token verificado em cada requisição via `JwtStrategy`
- Usuário consultado no banco a cada request (invalida tokens de usuários deletados)
- `ignoreExpiration: false` — tokens expirados são rejeitados

---

### 6. Autorização por recurso
Todo acesso a filmes valida `movie.userId === currentUser.id`. Tentativa de acessar recurso alheio retorna `403 Forbidden`.

---

### 7. Token TMDB via Bearer header
O `TMDB_ACCESS_TOKEN` é enviado no header `Authorization: Bearer`, nunca como query parameter. Isso garante que a chave **não aparece em logs de acesso** do servidor ou proxies.

---

### 8. Tratamento de erros sem vazamento de informações
O `AllExceptionsFilter` captura **todas** as exceções (incluindo erros internos não-HTTP). Em produção, erros `500` retornam apenas `"Erro interno do servidor"` — stack traces e mensagens de banco nunca chegam ao cliente.

---

### 9. Validação de variáveis de ambiente na inicialização
O `ConfigModule` com Joi valida todas as env vars obrigatórias ao iniciar. A aplicação **recusa iniciar** se alguma variável estiver faltando ou com formato inválido.

---

## O que NÃO commitar

| Arquivo | Motivo |
|---|---|
| `.env` | Contém todas as credenciais reais |
| `node_modules/` | Dependências |
| `dist/` | Build compilado |

O `.gitignore` já protege todos esses arquivos.

---

## Checklist antes do deploy

- [ ] `.env` com valores reais existe localmente mas **não está no git**
- [ ] `JWT_SECRET` tem 32+ caracteres aleatórios
- [ ] `JWT_SECRET` de produção é **diferente** do de desenvolvimento
- [ ] `FRONTEND_URL` aponta para a URL real do frontend
- [ ] `NODE_ENV=production` está configurado no Render
- [ ] Chave TMDB foi regenerada após exposição acidental
- [ ] Google Cloud Console tem as origens de produção autorizadas
