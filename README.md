# FinanceBoard

Controle de receitas e despesas mês a mês. Next.js (App Router) + React + Supabase (Postgres + Auth).

## Setup

### 1. Variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha (Supabase → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # só servidor
```

### 2. Banco de dados (Supabase CLI)
A CLI já está como dependência de desenvolvimento (`npm install` a instala), então use com `npx`:

```bash
npx supabase login                                  # abre o navegador
npx supabase link --project-ref <ref-do-projeto>    # ref = parte da URL: https://<ref>.supabase.co
npx supabase db push                                # aplica supabase/migrations/* (pede a senha do banco)
```

Isso cria as tabelas `users`, `items_classes` e `transaction_items`, ativa RLS e carrega as classes padrão.

> Alternativa sem CLI: cole os arquivos de `supabase/migrations/` (em ordem) no **SQL Editor** do painel.

### 3. Desativar cadastro público (importante)
Só o admin cria usuários. No painel: **Authentication → Sign In / Providers → desative "Allow new users to sign up"**.
Sem isso, qualquer pessoa com a URL e a chave anon consegue se cadastrar direto no Supabase Auth.

### 4. Criar o admin
1. No painel: **Authentication → Users → Add user → Create new user** (marque *Auto Confirm User*).
2. No **SQL Editor**, promova-o:

```sql
update public.users set role = 'admin' where email = 'seu-email@exemplo.com';
```

(O perfil em `public.users` é criado automaticamente por um trigger; a migration também faz o backfill de usuários que já existiam.)

### 5. Rodar
```bash
npm install
npm run dev     # http://localhost:3000
```

## Estrutura da API

| Prefixo | Uso | Autenticação |
|---|---|---|
| `/api/*` | Interno (o próprio front) | Sessão em cookie (Supabase Auth) |
| `/v1/*` | Externo / integrações | `Authorization: Bearer <token>` |

Documentação Swagger da `/v1`: **`/v1/docs`** (spec em `/v1/openapi.json`).

Obtendo um token para a `/v1`:

```bash
curl -X POST http://localhost:3000/v1/auth/token \
  -H 'content-type: application/json' \
  -d '{"email":"voce@exemplo.com","password":"sua-senha"}'
```

Endpoints (`/api` e `/v1` têm o mesmo conjunto de transações e classes):

- `GET/POST /transactions` · `GET/PATCH/DELETE /transactions/:id` · `GET /transactions/summary`
- `GET/POST /classes` · `GET/PATCH/DELETE /classes/:id`
- Somente `/api`: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET/POST /users`, `GET/PATCH/DELETE /users/:id` (admin)
- Somente `/v1`: `POST /auth/token`, `POST /auth/refresh`, `GET /me`

## Regras de negócio

- `value` é sempre positivo; quem define se soma ou desconta é `items_classes.is_receipt`.
- `transactionDate` (`YYYY-MM-DD`) é opcional: se omitida, usa hoje (fuso `America/Sao_Paulo`). `created_at` é automático.
- Classes padrão (`is_default`, sem dono) são visíveis a todos e somente leitura. Nome de classe é único por usuário (sem diferenciar maiúsculas) e não pode repetir o de uma padrão.
- Não é possível excluir uma classe em uso por transações.
- `type` da classe: `RECEITA`, `DESPESA_ESSENCIAL`, `DESPESA_NAO_ESSENCIAL`, `OUTRAS_DESPESAS` ou `TRANSFERENCIA_INTERNA`.
- O resumo mensal **não** soma `TRANSFERENCIA_INTERNA` em receitas/despesas/saldo; ela aparece separada em `transfers`.
- Excluir um usuário apaga em cascata suas transações e classes.
- Segurança em duas camadas: a API filtra por usuário e o banco reforça com RLS.

## Deploy (Vercel)
Configure as 3 variáveis de ambiente do passo 1 no projeto da Vercel. O restante é o build padrão do Next.js.

## Scripts
`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
