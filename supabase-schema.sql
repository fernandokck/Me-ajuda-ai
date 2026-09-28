-- ==============================================================================
-- 🤝 Me ajuda aí - Script de Correção e Configuração Completa do Supabase (SQL)
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
  user_id text,
  created_at timestamptz default now()
);

-- Remover restrições antigas que bloqueavam o salvamento
alter table if exists public.transactions drop constraint if exists transactions_user_id_fkey;
alter table if exists public.transactions alter column user_id drop not null;
alter table if exists public.transactions alter column id type text using id::text;
alter table if exists public.transactions add column if not exists user_email text;
alter table if exists public.transactions add column if not exists moeda text default 'BRL';
alter table if exists public.transactions add column if not exists subcategoria text default '';
alter table if exists public.transactions add column if not exists recorrente_id text;

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
  user_id text,
  created_at timestamptz default now()
);

-- Remover restrições antigas em recurring_rules
alter table if exists public.recurring_rules drop constraint if exists recurring_rules_user_id_fkey;
alter table if exists public.recurring_rules alter column user_id drop not null;
alter table if exists public.recurring_rules alter column id type text using id::text;
alter table if exists public.recurring_rules add column if not exists user_email text;
alter table if exists public.recurring_rules add column if not exists moeda text default 'BRL';
alter table if exists public.recurring_rules add column if not exists subcategoria text default '';
alter table if exists public.recurring_rules alter column criado_em drop not null;

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
  user_id text,
  created_at timestamptz default now()
);

-- Ajustes na tabela wallets
alter table if exists public.wallets alter column id type text using id::text;
alter table if exists public.wallets add column if not exists user_email text;
alter table if exists public.wallets add column if not exists moeda text default 'BRL';
alter table if exists public.wallets add column if not exists obs text default '';
alter table if exists public.wallets add column if not exists data_inicio text;
alter table if exists public.wallets add column if not exists atualizado_em text;
alter table if exists public.wallets add column if not exists user_id text;

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

-- Ajustes na tabela profiles
alter table if exists public.profiles add column if not exists user_email text;
alter table if exists public.profiles add column if not exists budgets jsonb default '{}'::jsonb;

-- 5. POLÍTICAS DE ACESSO (Row Level Security - RLS)
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
create policy "Permitir tudo em transactions para anon e auth" on public.transactions
  for all using (true) with check (true);

create policy "Permitir tudo em recurring_rules para anon e auth" on public.recurring_rules
  for all using (true) with check (true);

create policy "Permitir tudo em wallets para anon e auth" on public.wallets
  for all using (true) with check (true);

create policy "Permitir tudo em profiles para anon e auth" on public.profiles
  for all using (true) with check (true);
