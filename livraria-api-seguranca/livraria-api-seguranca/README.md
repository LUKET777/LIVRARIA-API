# 📚 Livraria API — Camada de Segurança

**Aluno:** Lucas Figueredo  
**Matrícula:** 2410469

API RESTful de Livros e Autores (Node.js + Express, Clean Architecture) com controle de acesso completo:

| Requisito | Implementação |
|---|---|
| Armazenamento seguro de credenciais | **BCrypt** (`bcryptjs`) com salt aleatório por senha e *work factor* configurável (padrão 10) |
| Autenticação stateless | **JWT** HS256 assinado no login, validado no header `Authorization: Bearer <token>` |
| Controle de acesso (RBAC) | Middlewares `autenticarToken` (401) e `exigirRole('ADMIN')` (403) |

## ▶️ Como executar

```bash
npm install
cp .env.example .env        # depois troque o JWT_SECRET por um valor aleatório
npm start                   # http://localhost:3000
npm test                    # 7 testes de integração da matriz de permissões
```

O front-end de teste fica em `public/index.html` e é servido em **http://localhost:3000**.

> Se você já tinha um `database.txt` da versão anterior, ele é corrigido automaticamente na inicialização (os hashes fictícios dos usuários-semente são trocados pelos reais).

## 🔑 Credenciais de teste

| Perfil | E-mail | Senha |
|---|---|---|
| ADMIN | admin@livraria.com | admin123 |
| USER (Leitor) | leitor@gmail.com | leitor123 |

## 📋 Matriz de permissões

| Método | Rota | Acesso | Sucesso | Falha |
|---|---|---|---|---|
| GET | `/api/v1/livros` | Público | 200 | — |
| GET | `/api/v1/livros/:id` | Público | 200 | — |
| POST | `/api/v1/auth/register` | Público | 201 | — |
| POST | `/api/v1/auth/login` | Público | 200 | 401 |
| POST | `/api/v1/livros/:id/comentarios` | USER ou ADMIN | 201 | 401 |
| POST | `/api/v1/autores` | Exclusivo ADMIN | 201 | 401 / 403 |
| POST | `/api/v1/livros` | Exclusivo ADMIN | 201 | 401 / 403 |

## 🛡️ Decisões de segurança

- **Senha nunca em texto puro:** `bcrypt.hash(senha, 10)` no cadastro e `bcrypt.compare` no login; o hash nunca é retornado pela API.
- **Sem escalonamento de privilégio:** o cadastro público sempre cria perfil `USER`, mesmo que o corpo envie `"role": "ADMIN"`.
- **Mensagem de erro genérica no login** ("Credenciais inválidas") e comparação BCrypt mesmo quando o e-mail não existe, para não revelar quais e-mails estão cadastrados.
- **JWT validado com algoritmo fixo** (`algorithms: ['HS256']`), bloqueando tokens `alg: none` e tokens assinados com outro segredo; expiração padrão de 1h.
- **Segredo fora do código:** `JWT_SECRET` vem do `.env` (ignorado pelo Git) e a API se recusa a subir se ele faltar ou tiver menos de 32 caracteres.
- **Autor do comentário vem do token**, não do corpo da requisição.
- **401 x 403:** 401 = sem token / token inválido ou expirado; 403 = autenticado, mas sem o perfil exigido.

## 🧪 Exemplos (curl)

```bash
# Login (ADMIN)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@livraria.com","senha":"admin123"}'

# Cadastrar autor com o token retornado
curl -X POST http://localhost:3000/api/v1/autores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"nome":"Clarice Lispector","nacionalidade":"Brasileira"}'
```

## 📁 Arquivos alterados/criados

- `config/auth.js` — configurações de JWT e BCrypt lidas do `.env`
- `middlewares/authMiddleware.js` — validação JWT (`jwt.verify`) e RBAC
- `services/AuthService.js` — hash BCrypt no cadastro, verificação e emissão de JWT no login
- `repositories/LivrariaRepository.js` — hashes reais dos usuários-semente e migração de bancos antigos
- `services/LivroService.js` — comentário vinculado ao usuário do token
- `tests/seguranca.test.js` — testes automatizados da matriz de permissões
- `public/index.html` — front-end de teste
