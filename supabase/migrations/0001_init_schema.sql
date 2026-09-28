-- FinanceBoard: schema inicial
-- Tabelas: users (perfil), items_classes, transaction_items
-- Segurança: RLS ativo; cada usuário enxerga apenas os próprios dados.

------------------------------------------------------------------
-- users (perfil ligado ao Supabase Auth)
------------------------------------------------------------------
create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  email      text not null,
  role       text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create unique index users_email_key on public.users (lower(email));

-- Cria o perfil automaticamente quando um usuário é criado no Supabase Auth.
-- O papel é sempre 'user'; para promover a admin veja o README.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Usuários que já existiam antes desta migration (ex.: admin criado pelo painel)
insert into public.users (id, name, email)
select id,
       coalesce(nullif(raw_user_meta_data ->> 'name', ''), split_part(email, '@', 1)),
       email
from auth.users
on conflict (id) do nothing;

------------------------------------------------------------------
-- items_classes
------------------------------------------------------------------
-- user_id nulo + is_default = true  -> classe padrão do sistema (todos veem, ninguém edita)
create table public.items_classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  type       text not null check (type in (
               'RECEITA',
               'DESPESA_ESSENCIAL',
               'DESPESA_NAO_ESSENCIAL',
               'OUTRAS_DESPESAS',
               'TRANSFERENCIA_INTERNA'
             )),
  is_receipt boolean not null default false,
  is_default boolean not null default false,
  user_id    uuid references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint items_classes_default_has_no_owner check (is_default = (user_id is null))
);

-- Nome único por usuário (e único entre as classes padrão), sem diferenciar maiúsculas
create unique index items_classes_owner_name_key
  on public.items_classes (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create index items_classes_user_id_idx on public.items_classes (user_id);

------------------------------------------------------------------
-- transaction_items
------------------------------------------------------------------
create table public.transaction_items (
  id               uuid primary key default gen_random_uuid(),
  description      text not null,
  -- NO ACTION: impede excluir uma classe em uso, mas permite a exclusão em cascata de um usuário
  classification_id uuid not null references public.items_classes (id),
  value            numeric(14, 2) not null check (value > 0),
  transaction_date date not null default current_date,
  created_at       timestamptz not null default now(),
  custom_data      jsonb not null default '{}'::jsonb,
  user_id          uuid not null references public.users (id) on delete cascade
);

create index transaction_items_user_date_idx on public.transaction_items (user_id, transaction_date desc);
create index transaction_items_classification_idx on public.transaction_items (classification_id);

------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------
alter table public.users             enable row level security;
alter table public.items_classes     enable row level security;
alter table public.transaction_items enable row level security;

-- users: cada um lê apenas o próprio perfil. Escritas só via service role (API de admin).
create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()));

-- items_classes: lê as padrão + as próprias; escreve só as próprias (nunca as padrão)
create policy items_classes_select on public.items_classes
  for select to authenticated
  using (is_default or user_id = (select auth.uid()));

create policy items_classes_insert on public.items_classes
  for insert to authenticated
  with check (not is_default and user_id = (select auth.uid()));

create policy items_classes_update on public.items_classes
  for update to authenticated
  using (not is_default and user_id = (select auth.uid()))
  with check (not is_default and user_id = (select auth.uid()));

create policy items_classes_delete on public.items_classes
  for delete to authenticated
  using (not is_default and user_id = (select auth.uid()));

-- transaction_items: somente as próprias, e só com classes visíveis ao usuário
create policy transaction_items_select on public.transaction_items
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy transaction_items_insert on public.transaction_items
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.items_classes c
      where c.id = classification_id
        and (c.is_default or c.user_id = (select auth.uid()))
    )
  );

create policy transaction_items_update on public.transaction_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.items_classes c
      where c.id = classification_id
        and (c.is_default or c.user_id = (select auth.uid()))
    )
  );

create policy transaction_items_delete on public.transaction_items
  for delete to authenticated
  using (user_id = (select auth.uid()));

------------------------------------------------------------------
-- Resumo por classe em um período (RLS se aplica: security invoker)
------------------------------------------------------------------
create function public.transaction_summary(p_from date, p_to date)
returns table (
  classification_id uuid,
  name              text,
  type              text,
  is_receipt        boolean,
  total             numeric,
  count             bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.name, c.type, c.is_receipt, sum(t.value), count(*)
  from public.transaction_items t
  join public.items_classes c on c.id = t.classification_id
  where t.transaction_date between p_from and p_to
  group by c.id, c.name, c.type, c.is_receipt
  order by sum(t.value) desc;
$$;
