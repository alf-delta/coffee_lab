-- Monoblend · схема журнала партий
-- Выполните в Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.batches (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  origin          text default '',
  roast_date      date not null,
  weight_g        integer default 0,
  roast_level     text default 'Medium',
  process         text default 'Washed',
  outgassing_days integer not null default 7,
  status          text not null default 'outgassing',
  bellwether_profile_id   text default '',
  bellwether_batch_number integer,
  green_weight_kg         numeric,
  roasted_weight_kg       numeric,
  scores          jsonb not null default '{
    "aroma":5,"flavor":5,"aftertaste":5,"acidity":5,"body":5,
    "balance":5,"sweetness":5,"cleanliness":5,"uniformity":5,"overall":5
  }'::jsonb,
  lab_data        jsonb not null default '{}'::jsonb,
  notes           text default '',
  transcript      text default '',
  analyzed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists batches_created_at_idx
  on public.batches (created_at desc);

-- RLS: для демо разрешаем анонимный доступ.
-- В проде замените на политики по auth.uid().
alter table public.batches enable row level security;

drop policy if exists "anon full access" on public.batches;
create policy "anon full access"
  on public.batches
  for all
  using (true)
  with check (true);

-- ── Каталог профилей Bellwether ──────────────────────────────
create table if not exists public.bellwether_profiles (
  id                     text primary key,
  coffee_name            text not null,
  profile_name           text default '',
  target_agtron_whole    numeric,
  target_agtron_ground   numeric,
  expected_moisture_loss numeric,
  created_at             timestamptz not null default now()
);

alter table public.bellwether_profiles enable row level security;

drop policy if exists "anon full access" on public.bellwether_profiles;
create policy "anon full access"
  on public.bellwether_profiles
  for all
  using (true)
  with check (true);

-- Стартовый каталог (можно править/удалять прямо в приложении)
insert into public.bellwether_profiles
  (id, coffee_name, profile_name, target_agtron_whole, target_agtron_ground, expected_moisture_loss)
values
  ('ethiopia_light_conv', 'Ethiopia Yirgacheffe Kochere', 'Light — Expressive Citrus (v2)', 85, 98, 12.5),
  ('colombia_med_sweet',  'Colombia Huila Supremo',       'Medium — Rich & Caramel',       68, 78, 13.2),
  ('kenya_aa_floral',     'Kenya Nyeri AA',               'Light-Medium — Blackcurrant',   78, 90, 13.8),
  ('brazil_dark_nutty',   'Brazil Cerrado',               'Medium-Dark — Nutty Chocolate', 55, 64, 14.5)
on conflict (id) do nothing;
