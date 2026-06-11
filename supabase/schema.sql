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
  outgassing_days integer not null default 3,
  -- второй порог дегазации: дней от обжарки до допуска в работу в кофейне
  service_days    integer not null default 10,
  status          text not null default 'outgassing',
  bellwether_profile_id   text default '',
  bellwether_batch_number integer,
  green_bean_id           text default '',
  green_weight_kg         numeric,
  roasted_weight_kg       numeric,
  -- замеры зелёного на момент жарки (Omix Plus по этой закладке)
  green_moisture          numeric,
  green_water_activity    numeric,
  green_density           numeric,
  scores          jsonb not null default '{
    "aroma":5,"flavor":5,"aftertaste":5,"acidity":5,"body":5,
    "balance":5,"sweetness":5,"cleanliness":5,"uniformity":5,"overall":5
  }'::jsonb,
  lab_data        jsonb not null default '{}'::jsonb,
  -- дескрипторы колеса вкусов SCA (массив строк-листьев колеса)
  flavors         jsonb not null default '[]'::jsonb,
  notes           text default '',
  transcript      text default '',
  analyzed_at     timestamptz,
  -- отметка ручного запуска партии в работу в кофейне (кнопка в карточке)
  in_service_at   timestamptz,
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
-- Профиль не привязан к сорту кофе: описывает поведение ростера и
-- применяется к любому зерну. roast_log — кривая из CSV-лога Bellwether
-- (прореженные каналы bean/spf/inlet + метрики), log_date — дата эталонной жарки.
create table if not exists public.bellwether_profiles (
  id                     text primary key,
  profile_name           text not null,
  target_agtron_whole    numeric,
  target_agtron_ground   numeric,
  expected_moisture_loss numeric,
  roast_log              jsonb,
  log_date               date,
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
  (id, profile_name, target_agtron_whole, target_agtron_ground, expected_moisture_loss)
values
  ('ethiopia_light_conv', 'Light — Expressive Citrus (v2)', 85, 98, 12.5),
  ('colombia_med_sweet',  'Medium — Rich & Caramel',        68, 78, 13.2),
  ('kenya_aa_floral',     'Light-Medium — Blackcurrant',    78, 90, 13.8),
  ('brazil_dark_nutty',   'Medium-Dark — Nutty Chocolate',  55, 64, 14.5)
on conflict (id) do nothing;

-- ── Каталог зерна (паспорта линейки Monoblend) ───────────────
-- Физический QC зелёного здесь не хранится: влажность/Aw/плотность
-- меняются с возрастом зерна и вводятся на партии при назначении жарки.
create table if not exists public.green_beans (
  id             text primary key,
  name           text not null,
  supplier       text default '',
  origin         text default '',
  farm           text default '',
  variety        text default '',
  process        text default '',
  process_detail text default '',
  altitude       text default '',
  harvest        text default '',
  sca            text default '',
  flavor_notes   text default '',
  role           text default '',
  story          text default '',
  hero           boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.green_beans enable row level security;

drop policy if exists "anon full access" on public.green_beans;
create policy "anon full access"
  on public.green_beans
  for all
  using (true)
  with check (true);

-- Стартовый лайнап на открытие (Those Coffee People + Gold Mountain)
insert into public.green_beans
  (id, name, supplier, origin, farm, variety, process, process_detail, altitude, sca, flavor_notes, role, story, hero)
values
  ('caicedo_washed', 'Caicedo Washed', 'Those Coffee People', 'Колумбия, Кайседо (Антиокия)',
   'Кооператив Aprokafes · Элкин Диоса', 'Castillo, Colombia, Caturra', 'Washed', '',
   '1950–2100 MASL', '84+', 'молочный шоколад, мёд, жёлтые фрукты, ваниль',
   'Daily driver · база эспрессо',
   'Также называется «Resiliencia» («Стойкость»). Кооператив Aprokafes объединяет мелких фермеров Кайседо под общим покупочным центром с контролем качества. Кайседо — отдалённый горный городок с историей кофеводства с 1872 года. Baseline VIP-дегустации: задаёт точку отсчёта линейки.',
   false),
  ('black_honey', 'Black Honey', 'Those Coffee People', 'Колумбия, Фредония (Антиокия)',
   'Семья Барриентос', '', 'Honey', 'Black Honey · 80–100% слизи при сушке',
   '', '86+', 'коричневый сахар, тёмный шоколад, персик, чёрный чай',
   'Сладкий якорь меню · к выпечке',
   'Семья Барриентос связана с наследием федерации колумбийских кофеводов. Black Honey — максимальная степень оставленной слизи (80–100%): больше тела и ферментированной сладости, чем у Yellow/Red Honey, самый «natural-like» из Honey-процессов. Меню-сюрприз зала.',
   false),
  ('caturra_chiroso', 'Caturra Chiroso', 'Those Coffee People', 'Колумбия',
   '', 'Caturra Chiroso', 'Washed', '',
   '', '87', 'флоральный, мандарин, лимонная трава, мёд',
   'Bright morning pour-over',
   'Chiroso — колумбийская мутация Caturra с удлинёнными зёрнами, долгое время считавшаяся разновидностью Geisha. Более высокий SCA, чем у Caicedo Washed, при заметно более сложном, прозрачном профиле. Редкий сорт, набирающий популярность у specialty-роастеров. Меню-сюрприз зала.',
   false),
  ('wush_wush', 'Wush Wush', 'Those Coffee People', 'Колумбия (сорт эфиопского происхождения)',
   'Las Nubes · Марко Эчеверри', 'Wush Wush (эфиопский heirloom)', 'Natural', '150-часовая анаэробная ферментация',
   '~1950 MASL', '90', 'какао, смородина, тропические фрукты, ромашка',
   'Hero bean · паринг с чёрной икрой',
   'Главный продукт Monoblend и финал VIP-сессии: соло → с чёрной икрой. 150-часовая анаэробная ферментация даёт глубокую funky-сладость с ягодно-тропическим DNA; иодные ноты икры усиливают её через умами-синергию, соль подавляет горечь, жир удлиняет послевкусие. Wush Wush — редкий низкоурожайный сорт родом из Эфиопии, конкурент Panama Geisha; Марко Эчеверри одним из первых внедрил его в Колумбии.',
   true),
  ('maximinos_maceration', 'Maximino''s Maceration', 'Gold Mountain Coffee Growers', 'Никарагуа, Хинотега',
   'Finca Santa Adela · Максимино Палациос и Марлен Эрнандес', 'Red Catuaí', 'Carbonic Maceration', '118-часовая двойная анаэробная ферментация',
   '1100–1240 MASL', '', 'красное яблоко, розовые флоральные ноты, мармелад, белый виноград',
   'Funky «wow» tasting',
   'Многократный лауреат Golden Bean Award. Карбоническая мацерация заимствована из виноделия: зёрна ферментируются в герметичной среде с CO₂. Gold Mountain — кооператив из 70+ фермеров Никарагуа; во время сбора на фермах дежурят «ripeness staff» с рефрактометрами. Самый «дикий» профиль линейки. Меню-сюрприз зала.',
   false),
  ('decaf_elixir', 'Decaf Elixir', 'Gold Mountain × Swiss Water', 'Никарагуа, Хинотега',
   '70+ малых фермеров Gold Mountain (вкл. Finca Idealista)', 'Bourbon, Catuaí, Caturra, Pacamara, Maracaturra…', 'Carbonic Maceration', 'CM Natural → Swiss Water Decaf (без растворителей)',
   '1300–1600 MASL', '', 'красное яблоко, тростниковый сахар, золотой киви, малина, слива',
   'Decaf без компромиссов',
   'Swiss Water — 100% химически чистая декофеинизация: первый батч насыщает воду ароматами и вымывает кофеин, последующие теряют только кофеин — ароматический профиль сохраняется полностью. Omni roast: подходит и для фильтра, и для эспрессо. Фактор удивления для гостей, ожидающих плоский decaf. Меню-сюрприз зала.',
   false)
on conflict (id) do nothing;
