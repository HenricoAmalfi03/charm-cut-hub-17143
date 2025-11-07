-- =====================================================
-- BARBEARIA PREMIUM - UNIFIED SETUP (fresh database)
-- Safe to run on a brand-new project (or will DROP/CREATE)
-- =====================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Cleanup (idempotent) -----------------------------------------------------
-- Drop objects we manage here (order matters)

-- Functions/triggers first
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_updated_at_column() cascade;
drop function if exists public.has_role(uuid, app_role) cascade;
drop function if exists public.is_admin(uuid) cascade;

-- RPCs
drop function if exists public.update_agendamento_status(uuid, status_agendamento) cascade;
drop function if exists public.update_barbeiro_perfil(uuid, text, text) cascade;
drop function if exists public.admin_toggle_barbeiro_ativo(uuid, boolean) cascade;
drop function if exists public.admin_delete_barbeiro(uuid) cascade;
drop function if exists public.create_barbeiro(text, text, text, text) cascade;
drop function if exists public.create_cliente(text, text, text) cascade;
drop function if exists public.authenticate_barbeiro(text, text) cascade;
drop function if exists public.authenticate_cliente(text, text) cascade;

-- Constraints that may block drop
alter table if exists public.agendamentos drop constraint if exists ag_no_overlap;

-- Tables
drop table if exists public.agendamentos cascade;
drop table if exists public.servicos cascade;
drop table if exists public.horarios_funcionamento cascade;
drop table if exists public.barbeiros cascade;
drop table if exists public.clientes cascade;
drop table if exists public.profiles cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.configuracoes_barbearia cascade;

-- Types
drop type if exists public.status_agendamento cascade;
drop type if exists public.app_role cascade;

-- Types --------------------------------------------------------------------
create type public.app_role as enum ('admin','user');
create type public.status_agendamento as enum ('pendente','confirmado','cancelado','realizado');

-- Utility functions ---------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Roles table ---------------------------------------------------------------
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role),
  created_at timestamptz default now()
);

alter table public.user_roles enable row level security;

-- Security definer to check roles (avoid recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin');
$$;

-- Policies for user_roles
create policy if not exists "Users see own roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy if not exists "Admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy if not exists "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy if not exists "Users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy if not exists "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(),'admin'));

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Auto-profile and bootstrap first admin -----------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;

  -- Make the first registered user an admin (bootstrap)
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Configurações da Barbearia ------------------------------------------------
create table public.configuracoes_barbearia (
  id uuid primary key default gen_random_uuid(),
  nome_estabelecimento text not null default 'Premium',
  logo_url text,
  endereco text default 'Rua Principal, 123 - Centro',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.configuracoes_barbearia enable row level security;

create policy if not exists "Public can read settings"
  on public.configuracoes_barbearia for select
  using (true);

create policy if not exists "Admins can manage settings"
  on public.configuracoes_barbearia for all
  to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create trigger update_configuracoes_barbearia_updated_at
before update on public.configuracoes_barbearia
for each row execute function public.update_updated_at_column();

-- Seed one row so admin updates never INSERT (avoids RLS insert errors)
insert into public.configuracoes_barbearia (nome_estabelecimento, endereco)
values ('Premium', 'Rua Principal, 123 - Centro')
on conflict do nothing;

-- Horários de funcionamento -------------------------------------------------
create table public.horarios_funcionamento (
  dia_semana smallint primary key check (dia_semana between 0 and 6), -- 0=Domingo
  abre boolean not null default false,
  hora_abre time,
  hora_fecha time,
  updated_at timestamptz default now()
);

alter table public.horarios_funcionamento enable row level security;

create policy if not exists "Public read horarios"
  on public.horarios_funcionamento for select
  using (true);

create policy if not exists "Admins manage horarios"
  on public.horarios_funcionamento for all
  to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Seed padrão: Seg-Sáb 09:00-18:00 (1-6), Domingo fechado (0)
insert into public.horarios_funcionamento(dia_semana, abre, hora_abre, hora_fecha) values
  (0, false, null, null),
  (1, true, '09:00', '18:00'),
  (2, true, '09:00', '18:00'),
  (3, true, '09:00', '18:00'),
  (4, true, '09:00', '18:00'),
  (5, true, '09:00', '18:00'),
  (6, true, '09:00', '13:00')
on conflict (dia_semana) do nothing;

-- Barbeiros -----------------------------------------------------------------
create table public.barbeiros (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  email text not null unique,
  senha_hash text not null,
  whatsapp text not null,
  avatar_url text,
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.barbeiros enable row level security;

create policy if not exists "Public read barbeiros"
  on public.barbeiros for select
  using (true);

create policy if not exists "Admins manage barbeiros"
  on public.barbeiros for all
  to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create trigger update_barbeiros_updated_at
before update on public.barbeiros
for each row execute function public.update_updated_at_column();

-- Clientes ------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  email text not null unique,
  senha_hash text not null,
  whatsapp text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clientes enable row level security;

create policy if not exists "Admin read clientes"
  on public.clientes for select
  to authenticated
  using (public.has_role(auth.uid(),'admin'));

create trigger update_clientes_updated_at
before update on public.clientes
for each row execute function public.update_updated_at_column();

-- Serviços ------------------------------------------------------------------
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null,
  duracao_minutos integer not null check (duracao_minutos > 0),
  ativo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.servicos enable row level security;

create policy if not exists "Public read servicos"
  on public.servicos for select
  using (true);

create policy if not exists "Admins manage servicos"
  on public.servicos for all
  to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create trigger update_servicos_updated_at
before update on public.servicos
for each row execute function public.update_updated_at_column();

-- Agendamentos --------------------------------------------------------------
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  barbeiro_id uuid not null references public.barbeiros(id) on delete restrict,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  horario_inicio timestamptz not null,
  horario_fim timestamptz not null,
  status public.status_agendamento not null default 'pendente',
  preco numeric(10,2),
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (horario_fim > horario_inicio)
);

alter table public.agendamentos enable row level security;

-- Select liberado para leitura em telas públicas (ajuste se necessário)
create policy if not exists "Public read agendamentos"
  on public.agendamentos for select
  using (true);

-- Atualizações e inserts preferencialmente via RPC (security definer)
create trigger update_agendamentos_updated_at
before update on public.agendamentos
for each row execute function public.update_updated_at_column();

-- Evitar horários conflitantes por barbeiro (pendente/confirmado/realizado)
alter table public.agendamentos add constraint ag_no_overlap
  exclude using gist (
    barbeiro_id with =,
    tstzrange(horario_inicio, horario_fim, '[)') with &&
  ) where (status in ('pendente','confirmado','realizado'));

-- Stored Procedures / RPCs --------------------------------------------------
-- Atualizar status (barbeiro) refletindo relatórios
create or replace function public.update_agendamento_status(
  p_agendamento_id uuid,
  p_status public.status_agendamento
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agendamentos
  set status = p_status,
      updated_at = now()
  where id = p_agendamento_id;
end;
$$;

-- Atualizar perfil do barbeiro (whatsapp + avatar)
create or replace function public.update_barbeiro_perfil(
  p_barbeiro_id uuid,
  p_whatsapp text,
  p_avatar_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.barbeiros
  set whatsapp = p_whatsapp,
      avatar_url = p_avatar_url,
      updated_at = now()
  where id = p_barbeiro_id;
end;
$$;

-- Admin ativa/desativa barbeiro
create or replace function public.admin_toggle_barbeiro_ativo(
  p_barbeiro_id uuid,
  p_ativo boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;
  update public.barbeiros
  set ativo = p_ativo,
      updated_at = now()
  where id = p_barbeiro_id;
end;
$$;

-- Admin remover barbeiro (se tiver agendamentos, faz soft-delete)
create or replace function public.admin_delete_barbeiro(
  p_barbeiro_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_agend boolean;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  select exists(select 1 from public.agendamentos where barbeiro_id = p_barbeiro_id)
    into v_has_agend;

  if v_has_agend then
    update public.barbeiros set ativo = false, updated_at = now() where id = p_barbeiro_id;
  else
    delete from public.barbeiros where id = p_barbeiro_id;
  end if;
end;
$$;

-- Criar barbeiro (somente admin)
create or replace function public.create_barbeiro(
  p_nome text,
  p_email text,
  p_senha text,
  p_whatsapp text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  insert into public.barbeiros (nome_completo, email, senha_hash, whatsapp)
  values (p_nome, p_email, crypt(p_senha, gen_salt('bf')), p_whatsapp)
  returning id into v_id;

  return v_id;
end;
$$;

-- Criar cliente
create or replace function public.create_cliente(
  p_nome text,
  p_email text,
  p_senha text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.clientes (nome_completo, email, senha_hash, whatsapp)
  values (p_nome, p_email, crypt(p_senha, gen_salt('bf')), '');
  -- Ajuste: app já tornou whatsapp obrigatório no front; 
  -- se quiser forçar aqui, mude a assinatura para incluir p_whatsapp e valide.

  select id into v_id from public.clientes where email = p_email;
  return v_id;
end;
$$;

-- Autenticar barbeiro/cliente (se app usar auth própria)
create or replace function public.authenticate_barbeiro(p_email text, p_senha text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; begin
  select id into v_id from public.barbeiros 
   where email = p_email and senha_hash = crypt(p_senha, senha_hash) and ativo = true;
  return v_id;
end; $$;

create or replace function public.authenticate_cliente(p_email text, p_senha text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; begin
  select id into v_id from public.clientes 
   where email = p_email and senha_hash = crypt(p_senha, senha_hash);
  return v_id;
end; $$;

-- Storage (Bucket) ----------------------------------------------------------
-- Create bucket 'barbearia' with 2MB limit and image mime types
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbearia', 'barbearia', true, 2097152,
  array['image/jpeg','image/jpg','image/png','image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp'];

alter table storage.objects enable row level security;

-- Reset conflicting policies (safe if absent)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Users can update uploads" on storage.objects;
drop policy if exists "Users can delete uploads" on storage.objects;

create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'barbearia' );

create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'barbearia' and auth.role() = 'authenticated' );

create policy "Users can update uploads"
  on storage.objects for update
  using ( bucket_id = 'barbearia' and auth.role() = 'authenticated' );

create policy "Users can delete uploads"
  on storage.objects for delete
  using ( bucket_id = 'barbearia' and auth.role() = 'authenticated' );

-- Grants (RLS still governs access) ----------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Seed serviços básicos -----------------------------------------------------
insert into public.servicos (nome, preco, duracao_minutos, ativo) values
  ('Corte Masculino', 40.00, 40, true),
  ('Barba', 30.00, 30, true),
  ('Corte + Barba', 65.00, 70, true)
on conflict do nothing;

-- Notes ---------------------------------------------------------------------
-- 1) Duplo agendamento: bloqueado por constraint ag_no_overlap.
-- 2) "Realizado": use RPC update_agendamento_status(..., 'realizado').
-- 3) Remover barbeiro: use RPC admin_delete_barbeiro(id) ou admin_toggle_barbeiro_ativo(id,false).
-- 4) Upload de logo: bucket/public + políticas acima (requer usuário autenticado no app).
-- 5) Dias/horários: mantenha horarios_funcionamento; no front, esconda dias com abre=false e horários fora do intervalo.
