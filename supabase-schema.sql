-- ==============================================================================
-- 🤝 Me ajuda aí - Script de Configuração do Supabase (SQL)
-- Execute este script completo no SQL Editor do seu projeto Supabase:
-- https://app.supabase.com/project/_/sql
-- ==============================================================================

-- 1. TABELA DE TRANSAÇÕES (transactions)
create table if not exists public.transactions (
  id text primary key,
  user_email text not null,
  tipo text not null,
  subcategoria text default '',
  data text not null,
  descricao text not null,
  valor numeric not null default 0,
  moeda text default 'BRL',
  recorrente_id text,
  created_at timestamptz default now()
);

-- Garantir que todas as colunas necessárias existam
alter table public.transactions add column if not exists user_email text;
alter table public.transactions add column if not exists moeda text default 'BRL';
alter table public.transactions add column if not exists subcategoria text default '';
alter table public.transactions add column if not exists recorrente_id text;

-- 2. TABELA DE REGRAS RECORRENTES (recurring_rules)
create table if not exists public.recurring_rules (
  id text primary key,
  user_email text not null,
  tipo text not null,
  subcategoria text default '',
  descricao text not null,
  valor numeric not null default 0,
  moeda text default 'BRL',
  dia_vencimento integer not null default 1,
  criado_em text,
  created_at timestamptz default now()
);

-- Garantir colunas
alter table public.recurring_rules add column if not exists user_email text;
alter table public.recurring_rules add column if not exists moeda text default 'BRL';
alter table public.recurring_rules add column if not exists subcategoria text default '';

-- 3. TABELA DE CARTEIRA / ALOCAÇÃO DE PATRIMÔNIO (wallets)
create table if not exists public.wallets (
  id text primary key,
  user_email text not null,
  nome text not null,
  tipo text default 'conta',
  saldo numeric not null default 0,
  moeda text default 'BRL',
  obs text default '',
  data_inicio text,
  atualizado_em text,
  created_at timestamptz default now()
);

-- Garantir colunas
alter table public.wallets add column if not exists user_email text;
alter table public.wallets add column if not exists moeda text default 'BRL';

-- 4. TABELA DE PERFIS / GAMIFICAÇÃO / METAS (profiles)
create table if not exists public.profiles (
  user_email text primary key,
  id text,
  nome text,
  faixa text,
  sobra numeric default 0,
  dificuldade text,
  meta numeric default 0,
  sabe_para_onde text,
  sabe_investir text,
  badge jsonb,
  budgets jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Garantir colunas
alter table public.profiles add column if not exists user_email text;
alter table public.profiles add column if not exists budgets jsonb default '{}'::jsonb;

-- 5. POLÍTICAS DE ACESSO (Row Level Security - RLS)
-- Habilita RLS em todas as tabelas
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.wallets enable row level security;
alter table public.profiles enable row level security;

-- Remove políticas antigas para evitar duplicação ou conflito
drop policy if exists "Permitir tudo em transactions para anon e auth" on public.transactions;
drop policy if exists "Permitir tudo em recurring_rules para anon e auth" on public.recurring_rules;
drop policy if exists "Permitir tudo em wallets para anon e auth" on public.wallets;
drop policy if exists "Permitir tudo em profiles para anon e auth" on public.profiles;

-- Cria políticas universais que permitem Leitura, Inserção, Atualização e Exclusão
-- filtradas por user_email no app para usuários anon (e-mail) e autenticados (Google)
create policy "Permitir tudo em transactions para anon e auth" on public.transactions
  for all using (true) with check (true);

create policy "Permitir tudo em recurring_rules para anon e auth" on public.recurring_rules
  for all using (true) with check (true);

create policy "Permitir tudo em wallets para anon e auth" on public.wallets
  for all using (true) with check (true);

create policy "Permitir tudo em profiles para anon e auth" on public.profiles
  for all using (true) with check (true);
