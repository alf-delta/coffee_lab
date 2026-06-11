# CLAUDE.md — Monoblend (кофейная лаборатория)

Веб-приложение для контроля качества обжарки: журнал партий, трекер дегазации
(два порога: анализ / допуск в работу), пошаговый мастер анализа, колесо вкусов SCA,
органолептика + физические метрики с анализаторов DiFluid (Omix Plus / R2 Extract),
каталог зерна (лайнап Monoblend), профили ростера Bellwether с импортом CSV-логов
жарки (кривая + метрики), авто-скор и ИИ-комментарий на базе знаний обжарки.

## Команды

```bash
npm install
npm run dev      # Vite dev-сервер (5173, либо следующий свободный порт)
npm run build    # прод-сборка в dist/ — ОБЯЗАТЕЛЬНО гонять после правок (ловит JSX/импорты)
npm run preview
```

Проверка модулей без перезапуска: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/src/<path>`
(200 = транспилируется; Vite отдаёт 500 при ошибке).

## Стек

React 18 + Vite 5 + **Tailwind v4** (плагин `@tailwindcss/vite`, без tailwind.config —
токены в `@theme` внутри `src/index.css`). framer-motion (анимации), lucide-react (иконки).
Хранение: **Supabase ⇄ localStorage** (см. ниже). Голос: Web Speech API. ИИ-разбор речи:
Supabase Edge Function (Claude) с локальным fallback.

## Архитектура

### Слой хранения — `src/lib/storage.js`
Единый async-API: `listBatches/createBatch/updateBatch/deleteBatch`,
`listProfiles/createProfile/updateProfile/deleteProfile` и
`listBeans/createBean/updateBean/deleteBean`.
- `storageMode` = `'supabase'` если заданы `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  (`src/lib/supabase.js`), иначе `'local'` (localStorage с демо-сидом).
- Ключи localStorage версионируются: `monoblend.batches.v7`, `monoblend.profiles.v2`,
  `monoblend.beans.v2`. **При изменении формы сида/модели — поднимай версию ключа**,
  иначе у локальных юзеров останутся старые данные.

### Модель данных
**batch:** `id, name, origin, roast_date (YYYY-MM-DD), weight_g, roast_level (label-строка),
process, outgassing_days, service_days, status, scores (10 ключей 1–10), lab_data (7 ключей),
flavors (массив строк — листья колеса вкусов), notes, transcript, green_bean_id,
bellwether_profile_id, bellwether_batch_number, green_weight_kg, roasted_weight_kg,
green_moisture, green_water_activity, green_density, analyzed_at, in_service_at, created_at`.
Два порога дегазации от даты обжарки (дефолты в `constants.js`, оба настраиваются в
`AddBatchModal`): `outgassing_days` (3 дн) — до готовности к анализу, двигает статусную
цепочку; `service_days` (10 дн) — до допуска в работу в кофейне, на статусы НЕ влияет
(хелперы `serviceDate/serviceDaysRemaining/isInService` в `src/lib/outgassing.js`;
событие в `CalendarPanel`). Индикатор на `BatchCard`: дегазация — жёлтый круг с днями;
готово к анализу — КОРИЧНЕВАЯ галочка; после анализа — скор, при наступлении допуска
поверх скора зелёная галочка-бейдж; кнопка «Запущено в работу» в шапке `BatchDetail`
ставит `in_service_at` и убирает зелёную галочку (остаётся чистый скор).
QC зелёного (`green_*`) — замеры Omix Plus по этой закладке, вводятся в `AddBatchModal`
при назначении жарки (влажность/Aw зависят от возраста зерна) и показываются read-only
в `LabReadings` (проп `green={batch}`).
**profile (Bellwether):** `id (text PK), profile_name, target_agtron_whole,
target_agtron_ground, expected_moisture_loss, roast_log (jsonb|null), log_date, created_at`.
Профиль НЕ привязан к сорту кофе (поле `coffee_name` удалено) — описывает поведение
ростера и применяется к любому зерну. `roast_log` — кривая эталонной жарки, импортируется
из CSV-лога Bellwether в `ProfilesModal`: парсер `src/lib/roastLog.js` (`parseRoastLog`
берёт только окно `Roast`, прореживает до шага 5 с, каналы bean/spf/inlet + метрики
загрузка/разворот/выгрузка/время; `rorSeries` — RoR для графика). График —
`RoastCurve.jsx` (SVG, зерно/уставка/RoR). Каталог профилей: list (карточки
с мини-кривой) → detail (график + метрики-островки) → form (дроп-зона CSV,
автозаполнение имени и параметров — юзеру остаётся нажать «Сохранить»).
**bean (каталог зерна, паспорт линейки — БЕЗ физического QC):** `id (text PK), name, supplier,
origin, farm, variety, process, process_detail, altitude, harvest, sca, flavor_notes
(строка через запятую), role, story, hero (bool), created_at`. Сид — стартовый лайнап
Monoblend (6 сортов: Caicedo Washed, Black Honey, Caturra Chiroso, Wush Wush ⭐,
Maximino's Maceration, Decaf Elixir).

Константы и фабрики — `src/data/constants.js`: `PARAMETERS` (10 органолептических),
`STATUS`, `ROAST_LEVELS` (**объект** `{LIGHT:{label,min_agtron},…}` — шкала Agtron),
`ROAST_LEVEL_LABELS` (плоский список для селектов/индексов; включает стилевой уровень
`'Espresso'` вне шкалы Agtron — новые уровни добавлять только в конец, по индексам живут
дефолты форм и сид), `roastLevelFromAgtron` (работает только по шкальным уровням),
`LAB_METRICS` (метрики приборов с unit/min/max/step), `GREEN_QC_METRICS` (QC зелёного —
поля партии!), `DEFAULT_BELLWETHER_PROFILES`, `DEFAULT_GREEN_BEANS`,
`defaultScores/defaultLabData/defaultProfile/defaultBean/defaultGreenQC`.

### Каталог зерна — `BeansModal.jsx`
Три вью внутри одной модалки (`max-w-3xl`): **list** (сетка карточек: hero-звезда, SCA-бейдж,
чипсы вкусовых нот, сводка обжарок + спарклайн скоров) → **detail** (паспорт-островки,
story, история партий этого зерна, кнопка «Обжарить это зерно») → **form** (CRUD паспорта).
Получает `batches` из `App` для статистики (связь `batch.green_bean_id`); `onRoast(beanId)`
закрывает каталог и открывает `AddBatchModal` с предвыбранным зерном (`initialBeanId`).
Выбор зерна в форме партии автозаполняет название/происхождение/обработку.

### Статусы и ветвление вида
Цепочка: `outgassing → ready → analysis → done`.
- `effectiveStatus(batch)` (`src/lib/outgassing.js`) авто-выводит `outgassing`/`ready` по дате
  (`roast_date + outgassing_days`); `analysis`/`done` — ручные и не сбрасываются.
- В `App.jsx` каждый batch обогащается `_status = effectiveStatus(batch)`.
- **`BatchDetail.jsx` рендерит один из трёх режимов по `batch._status`:**
  - `ready` → `AnalysisWizard` (пошаговый мастер);
  - `outgassing` → `OutgassingCountdown` (фокус-экран: отсчёт + дата готовности);
  - `analysis`/`done` → двухзонный дашборд.

### Двухзонный дашборд (готовый анализ)
Контейнера-подложки нет — формы «висят» на размытом фоне. Сверху — «островки»
тех-данных + важные даты (равная ширина через `auto-fit minmax`). Затем две колонки:
- **Левая (тёмная, «исследование»):** `AiComment` (на всю высоту, внутренний скролл) +
  `LabReadings` (read-only показатели приборов, **без полей ввода**).
- **Правая (светлая, «вкусовой профиль»):** радар + кольцо скора/грейд/теги, ползунки, заметки.

### Колесо вкусов SCA — `FlavorWheel.jsx` + `src/data/flavorWheel.js`
Данные колеса (рус. локализация, 3 уровня, ~85 листьев с цветами SCA) — `FLAVOR_WHEEL`;
плоский индекс `FLAVOR_INDEX`/`flavorColor(name)` для чипсов. **Имена листьев уникальны** —
на этом держится `batch.flavors` (массив строк). Компонент — модалка (z-60) с SVG-санбёрстом:
клики по внешним плашкам/подписям и листьям 2-го уровня («Чёрный чай», «Бобовый»…) тогглят
выбор, «Сохранить вкусы» коммитит через `onSave`. Экспортирует `FlavorChips`.
Открывается кнопкой «Колесо вкусов» у скора в дашборде (сохраняет сразу через
`updateBatch`) и на шаге «Органолептика» мастера (попадает в payload `onRecord`).

### Мастер анализа — `AnalysisWizard.jsx`
Шаги: Omix Plus → R2 Extract → Органолептика (голос + ползунки + колесо вкусов) →
Заметки → Предпросмотр. Черновик стартует **пустым** (`scores = {}`, без предзаполнения).
«Записать анализ» коммитит scores/lab/notes/flavors, ставит `status = done` и `analyzed_at = now`.
**Лабораторные данные редактируются ТОЛЬКО здесь**; в дашборде они read-only.

### Скоринг и знания
- `src/lib/scoring.js`: `totalScore` (сумма 10 → 0–100), `grade`, `profileDescription`,
  `extractionTags(labData)` (только технологические теги; вкусовые дескрипторы — вручную
  через колесо вкусов, `batch.flavors`), `analyzeLabData` (QC-алерты),
  `validateBellwetherProfile(profile, labData)` (принимает **resolved-профиль**, не id),
  `weightLoss`, `scoreSummary`.
- `src/lib/knowledge.js`: `roastCommentary(batch, profile)` → массив инсайтов
  `{key, tone, title, text, advice?, value?, unit?}` для `AiComment`. Правила **закодированы**
  на основе материалов `roster_kno` (сенсорика/химия/физика) — это reference-материал
  в `~/Downloads/roster_kno`, **не в репозитории**; файл не читает .md в рантайме.

### Голос и парсинг — `speech.js`, `parseCupping.js`
Web Speech (ru-RU) → `parseCupping` шлёт транскрипт в edge-функцию `parse-cupping`
(Claude `claude-opus-4-8`), при недоступности — локальный словарный парсер. Ключ Anthropic
живёт в секретах Supabase, не в браузере.

## Дизайн-конвенции (`src/index.css`)
- Палитра/шрифты — токены в `@theme` (`--color-cream/espresso/coffee/gold/latte/amber…`,
  `--font-display: Fraunces`, `--font-sans: Inter`). Используются как утилиты:
  `text-espresso`, `bg-coffee/8`, `text-latte/70` и т.п.
- Поверхности: `.glass`, `.glass-soft` (на светлом фоне), **`.glass-light`** (почти
  непрозрачная — для светлых панелей НАД тёмным размытым фоном, иначе тёмный текст тонет),
  `.glass-dark`, `.glass-dark-soft`, `.field-dark`, `.btn-gold`, ползунок `.mb-range`.
- Фон страницы — **фиксированный псевдо-слой `body::before`** (НЕ `background-attachment: fixed`
  — он давал scroll-jank). Blur держать умеренным (perf).
- Тона инсайтов ИИ: `good #7cc18d / warn #e0c074 / bad #e89a92 / info #cdb79a`.
- Везде уважается `prefers-reduced-motion`.

## Подводные камни (важно)
- **ASCII в идентификаторах.** Однажды переменная с кириллической «С» (`vСss`) дала баг —
  имена переменных только латиницей.
- `ROAST_LEVELS` — объект, НЕ массив: для опций/индексов бери `ROAST_LEVEL_LABELS`.
- Bellwether-профили динамические (CRUD), прокидываются пропсами из `App`; `BatchDetail`
  резолвит `profile = profiles.find(id === bellwether_profile_id)` и передаёт объект дальше.
- Длинные значения в островках — компонент `Marquee` (бежит только при переполнении;
  цикл «прокрутилась → пауза → мгновенно в начало», НЕ реверс — реверс «елозит»).
- **Гриды без явных колонок ломают мобильную вёрстку:** `grid gap-3` даёт auto-колонку,
  которая растёт по max-content содержимого и выталкивает контент за экран. Всегда
  `grid-cols-1` (+ `sm:grid-cols-N`) — это `minmax(0,1fr)`.
- Даты `YYYY-MM-DD` в `new Date()` парсятся как UTC-полночь и в минусовых поясах уезжают
  на день назад — для отображения добавлять `T00:00:00`.
- После любых правок гонять `npm run build` — это основная проверка (тестов нет).
- Не коммить `.env`, `node_modules`, `dist`, `.claude/settings.local.json` (в `.gitignore`).

## Supabase / деплой
`supabase/schema.sql` — таблицы `batches`, `bellwether_profiles`, `green_beans`
(RLS, демо-сид). Схема описывает НОВЫЕ установки: `create table if not exists` не
мигрирует существующие таблицы — при изменении модели нужен ручной `alter table`.
`supabase/functions/parse-cupping/index.ts` — edge-функция Claude.
Подключение и секрет `ANTHROPIC_API_KEY` — в `README.md`.

## Git
Репозиторий: https://github.com/alf-delta/coffee_lab (ветка `main`).
Коммитить/пушить только по явной просьбе. Сообщения коммитов заканчивать строкой
`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
