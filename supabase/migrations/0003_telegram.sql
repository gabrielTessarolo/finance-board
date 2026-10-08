-- Tokens temporários para vincular conta Telegram a um usuário (expiram em 10 min)
create table public.telegram_enrollment_tokens (
  token         text        primary key,
  user_id       uuid        not null references public.users(id) on delete cascade,
  refresh_token text        not null,
  expires_at    timestamptz not null default (now() + interval '10 minutes'),
  created_at    timestamptz not null default now()
);

-- Sessões ativas do bot por conta Telegram
create table public.telegram_sessions (
  id               uuid        primary key default gen_random_uuid(),
  telegram_chat_id bigint      not null,
  user_id          uuid        not null references public.users(id) on delete cascade,
  refresh_token    text        not null,
  created_at       timestamptz not null default now(),
  last_access_at   timestamptz not null default now(),
  revoked_at       timestamptz
);

create index telegram_sessions_chat_id_idx on public.telegram_sessions (telegram_chat_id);
create index telegram_sessions_user_id_idx on public.telegram_sessions (user_id);

-- RLS
alter table public.telegram_enrollment_tokens enable row level security;
alter table public.telegram_sessions          enable row level security;

-- Enrollment tokens: usuário autenticado cria/lê apenas os seus
create policy telegram_enrollment_tokens_insert on public.telegram_enrollment_tokens
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy telegram_enrollment_tokens_select on public.telegram_enrollment_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Sessions: usuário autenticado pode ver e revogar as suas (bot usa service role)
create policy telegram_sessions_select on public.telegram_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy telegram_sessions_update on public.telegram_sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
