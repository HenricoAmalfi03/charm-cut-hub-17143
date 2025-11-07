-- =====================================================
-- CONFIGURAÇÕES DA BARBEARIA
-- =====================================================

-- Tabela de configurações
create table if not exists public.configuracoes_barbearia (
  id uuid primary key default gen_random_uuid(),
  nome_estabelecimento text not null default 'Premium',
  logo_url text,
  endereco text default 'Rua Principal, 123 - Centro',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar RLS
alter table public.configuracoes_barbearia enable row level security;

-- Policies: todos podem ler, apenas autenticados podem atualizar
create policy "Qualquer um pode ver as configurações"
on public.configuracoes_barbearia
for select
using (true);

create policy "Apenas autenticados podem atualizar"
on public.configuracoes_barbearia
for update
using (auth.role() = 'authenticated');

-- Inserir configuração inicial
insert into public.configuracoes_barbearia (nome_estabelecimento, endereco)
values ('Premium', 'Rua Principal, 123 - Centro')
on conflict do nothing;

-- Trigger para atualizar updated_at
create trigger update_configuracoes_barbearia_updated_at
before update on public.configuracoes_barbearia
for each row
execute function public.update_updated_at_column();
