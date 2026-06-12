# Monoblend · Кофейная лаборатория

Веб-приложение для кофейной лаборатории: журнал обжаренных партий, трекер дегазации
(outgassing), пайплайн статусов, голосовой ввод наблюдений с разбором через ИИ,
органолептическая оценка по 10 параметрам, авто-скор и грейд, радарная диаграмма,
заметки, фильтрация и сводная статистика.

Стек: **React + Vite + Tailwind v4**, хранение — **Supabase** (с fallback на
`localStorage`), AI-разбор речи — **Claude API** через Supabase Edge Function
(с fallback на локальный словарный парсер).

## Быстрый старт

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`. **Без всякой настройки** оно сразу
работает: данные хранятся в `localStorage`, голос распознаётся в браузере (Web Speech),
а разбор наблюдений делает встроенный локальный парсер русской дегустационной лексики.

> Голосовой ввод требует Chrome/Edge (Web Speech API). В других браузерах поле ввода
> остаётся доступным — можно вставить текст вручную.

## Подключение Supabase (хранение данных)

1. Создайте проект на [supabase.com](https://supabase.com).
2. В **SQL Editor** выполните `supabase/schema.sql` — создастся таблица `batches`.
3. Скопируйте `.env.example` → `.env` и заполните:

   ```
   VITE_SUPABASE_URL=https://<ваш-проект>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```

4. Перезапустите `npm run dev`. В шапке индикатор сменится на «Supabase».

## Подключение Claude API (разбор речи в оценки)

Ключ Anthropic хранится **на сервере** (в секретах Supabase), не в браузере.

```bash
# установите Supabase CLI, затем:
supabase login
supabase link --project-ref <project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy parse-cupping --no-verify-jwt
```

После деплоя кнопка «Разобрать и заполнить» отправляет транскрипт в функцию
`parse-cupping`, которая зовёт Claude (`claude-opus-4-8`) и возвращает 10 оценок + резюме.
Если функция недоступна — приложение молча использует локальный парсер.

## Оркестратор анализа обжарки (`roast-analyst`)

Анализ партии Claude'ом, заземлённый на корпус знаний обжарки (`roster_kno`:
сенсорика / химия / физика, вендорено в `supabase/functions/roast-analyst/knowledge/`).
Тот же секрет `ANTHROPIC_API_KEY`.

```bash
# одноразово: добавить колонки кэша анализа в таблицу batches
#   (SQL Editor) → выполнить ALTER из supabase/schema.sql:
#   alter table public.batches add column if not exists ai_analysis jsonb;
#   alter table public.batches add column if not exists ai_analyzed_at timestamptz;
supabase functions deploy roast-analyst --no-verify-jwt
```

Как устроено:
- **Контракт `Q_REPORT`** (`src/lib/qreport.js`) — единый формат вывода для всех источников:
  `{ verdict, findings, actions, data_gaps }` (решение → доказательства → действия → пробелы).
  Панель Monoblend Q (`AiComment`) рендерит любой источник одинаково.
- **Команды** — реестр `commands.ts` (что Claude умеет; у каждой своя `model` — тиринг
  Haiku/Sonnet/Opus). `analyze_batch` (одиночный разбор → Q_REPORT), доменные
  `analyze_curve/chemistry/sensory`, `synthesize_verdict`, `diagnose_defect`.
  Запрос: `POST … { command, payload }`.
- **Пайплайн** — реестр `pipelines.ts` + исполнитель в `index.ts`. `batch_full` гоняет
  стадии (curve→chemistry→sensory→synthesize, разные модели) server-side и
  ДЕТЕРМИНИРОВАННО собирает Q_REPORT (`assemble()` считает балл/грейд кодом).
  Запрос: `POST … { pipeline, payload }` → `{ result, trace }` (трейс по стадиям + usage).
- **Знания** — в system отдельными блоками с `cache_control` (кэш ~5 мин).
- **Строгий JSON** — forced `tool_use` (схема = инструмент команды).
- **Триггер** — авто при записи анализа; результат кэшируется на партии
  (`batch.ai_analysis` + `ai_analyzed_at`), не пересчитывается на рендере. Кнопка ↻ — ручной перезапуск.
- **Fallback** — при недоступности API дашборд использует детерминированный
  `analyzeFallback()` из `src/lib/knowledge.js` (тот же контракт Q_REPORT, без сети).

## Как это работает

- **Статусы**: `Outgassing → Готово к анализу → Анализ → Завершено`. Первые два
  считаются автоматически по дате обжарки и сроку дегазации; «Анализ»/«Завершено»
  выставляются вручную и не сбрасываются автоматически.
- **Скор**: сумма 10 параметров (1–10) → 0–100, грейд: Outstanding (≥90),
  Excellent (≥85), Specialty Grade (≥80), Good (≥70)…
- **Радар** и **скор** обновляются в реальном времени при движении ползунков.

## Структура

```
src/
  data/constants.js      параметры, статусы, грейды, обжарки, обработки
  lib/
    scoring.js           итоговый балл, грейд, описание профиля, флейвор-теги
    outgassing.js        даты дегазации, прогресс, авто-статус
    storage.js           CRUD: Supabase ⇄ localStorage
    supabase.js          клиент
    speech.js            Web Speech API
    parseCupping.js      вызов edge-функции + локальный fallback-парсер
    qreport.js           контракт Q_REPORT (verdict/findings/actions/gaps) + normalizeReport
    knowledge.js         знаниевый слой: analyzeFallback → Q_REPORT (детерминир. fallback)
    aiClient.js          клиент оркестратора (команда / пайплайн → POST)
  components/            UI (карточки, модалки, радар, ползунки, голос…)
supabase/
  schema.sql             таблицы batches/profiles/beans + RLS
  functions/parse-cupping/index.ts   Edge Function: речь → 10 оценок (Claude)
  functions/roast-analyst/           Оркестратор анализа обжарки (Monoblend Q)
    index.ts                         сервер: кэш знаний + forced tool_use + runPipeline
    commands.ts                      реестр команд (модель на команду)
    pipelines.ts                     реестр пайплайнов + assemble (балл/грейд кодом)
    knowledge/*.md                   корпус roster_kno (сенсорика/химия/физика)
```
