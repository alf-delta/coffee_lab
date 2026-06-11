import { supabase, isSupabaseConfigured } from './supabase'
import {
  defaultScores,
  defaultLabData,
  STATUS,
  ROAST_LEVEL_LABELS,
  PROCESSING_METHODS,
  DEFAULT_BELLWETHER_PROFILES,
  DEFAULT_GREEN_BEANS,
} from '../data/constants'

const LS_KEY = 'monoblend.batches.v7'
const TABLE = 'batches'
const PROFILES_LS_KEY = 'monoblend.profiles.v2'
const PROFILES_TABLE = 'bellwether_profiles'
const BEANS_LS_KEY = 'monoblend.beans.v2'
const BEANS_TABLE = 'green_beans'

const uid = () =>
  (crypto?.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).slice(2))

// ── Демо-данные при первом запуске (localStorage режим) ───────
function seed() {
  const now = Date.now()
  const day = 86400000
  return [
    {
      id: uid(),
      name: 'Caicedo Washed',
      origin: 'Колумбия, Кайседо (Антиокия)',
      roast_date: new Date(now - 9 * day).toISOString().slice(0, 10),
      weight_g: 1200,
      roast_level: ROAST_LEVEL_LABELS[2],
      process: PROCESSING_METHODS[0],
      outgassing_days: 3,
      service_days: 10,
      status: STATUS.DONE,
      green_bean_id: 'caicedo_washed',
      bellwether_profile_id: 'colombia_med_sweet',
      bellwether_batch_number: 1042,
      green_weight_kg: 2.7,
      roasted_weight_kg: 2.36,
      green_moisture: 10.9,
      green_water_activity: 0.55,
      green_density: 710,
      scores: { aroma: 8, flavor: 9, aftertaste: 8, acidity: 8, body: 7, balance: 9, sweetness: 9, cleanliness: 9, uniformity: 8, overall: 9 },
      lab_data: { roast_color_whole: 68, roast_color_ground: 78, moisture: 2.4, water_activity: 0.46, true_density: 700, brew_tds: 1.38, brew_ey: 20.5 },
      notes: 'Молочный шоколад, мёд, чистый финиш. База эспрессо подтверждена.',
      flavors: ['Шоколад', 'Мёд', 'Яблоко', 'Ваниль'],
      transcript: '',
      analyzed_at: new Date(now - 1 * day).toISOString(),
      created_at: new Date(now - 9 * day).toISOString(),
    },
    {
      id: uid(),
      name: 'Wush Wush',
      origin: 'Колумбия (сорт эфиопского происхождения)',
      roast_date: new Date(now - 4 * day).toISOString().slice(0, 10),
      weight_g: 900,
      roast_level: ROAST_LEVEL_LABELS[0],
      process: PROCESSING_METHODS[1],
      outgassing_days: 5,
      service_days: 12,
      status: STATUS.OUTGASSING,
      green_bean_id: 'wush_wush',
      bellwether_profile_id: 'ethiopia_light_conv',
      bellwether_batch_number: 1043,
      green_weight_kg: 2.7,
      roasted_weight_kg: 2.34,
      green_moisture: 10.6,
      green_water_activity: 0.53,
      green_density: 735,
      scores: defaultScores(),
      lab_data: { ...defaultLabData(), roast_color_whole: 86, roast_color_ground: 97, moisture: 3.2, water_activity: 0.52, true_density: 690 },
      notes: '',
      transcript: '',
      created_at: new Date(now - 4 * day).toISOString(),
    },
    {
      id: uid(),
      name: "Maximino's Maceration",
      origin: 'Никарагуа, Хинотега',
      roast_date: new Date(now - 12 * day).toISOString().slice(0, 10),
      weight_g: 750,
      roast_level: ROAST_LEVEL_LABELS[1],
      process: PROCESSING_METHODS[4],
      outgassing_days: 3,
      service_days: 10,
      status: STATUS.OUTGASSING,
      green_bean_id: 'maximinos_maceration',
      green_moisture: 11.1,
      green_water_activity: 0.57,
      green_density: 690,
      scores: defaultScores(),
      lab_data: { ...defaultLabData(), roast_color_whole: 80, roast_color_ground: 90, moisture: 4.3, water_activity: 0.58, true_density: 705 },
      notes: '',
      transcript: '',
      created_at: new Date(now - 12 * day).toISOString(),
    },
  ]
}

// ── localStorage backend ──────────────────────────────────────
const local = {
  list() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
    const initial = seed()
    localStorage.setItem(LS_KEY, JSON.stringify(initial))
    return initial
  },
  save(rows) {
    localStorage.setItem(LS_KEY, JSON.stringify(rows))
  },
  create(data) {
    const rows = local.list()
    const row = { ...data, id: uid(), created_at: new Date().toISOString() }
    rows.unshift(row)
    local.save(rows)
    return row
  },
  update(id, patch) {
    const rows = local.list().map((r) => (r.id === id ? { ...r, ...patch } : r))
    local.save(rows)
    return rows.find((r) => r.id === id)
  },
  remove(id) {
    local.save(local.list().filter((r) => r.id !== id))
  },
}

// ── Supabase backend ──────────────────────────────────────────
const remote = {
  async list() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  async create(data) {
    const { data: row, error } = await supabase
      .from(TABLE)
      .insert(data)
      .select()
      .single()
    if (error) throw error
    return row
  },
  async update(id, patch) {
    const { data: row, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return row
  },
  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },
}

// ── Публичный API (всегда async) ──────────────────────────────
export const storageMode = isSupabaseConfigured ? 'supabase' : 'local'

export async function listBatches() {
  return storageMode === 'supabase' ? remote.list() : local.list()
}
export async function createBatch(data) {
  return storageMode === 'supabase' ? remote.create(data) : local.create(data)
}
export async function updateBatch(id, patch) {
  return storageMode === 'supabase' ? remote.update(id, patch) : local.update(id, patch)
}
export async function deleteBatch(id) {
  return storageMode === 'supabase' ? remote.remove(id) : local.remove(id)
}

// ── Профили Bellwether ────────────────────────────────────────
function seedProfiles() {
  const now = Date.now()
  return DEFAULT_BELLWETHER_PROFILES.map((p, i) => ({
    ...p,
    created_at: new Date(now - i * 1000).toISOString(),
  }))
}

const localProfiles = {
  list() {
    try {
      const raw = localStorage.getItem(PROFILES_LS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
    const initial = seedProfiles()
    localStorage.setItem(PROFILES_LS_KEY, JSON.stringify(initial))
    return initial
  },
  save(rows) {
    localStorage.setItem(PROFILES_LS_KEY, JSON.stringify(rows))
  },
  create(row) {
    const rows = localProfiles.list()
    rows.unshift(row)
    localProfiles.save(rows)
    return row
  },
  update(id, patch) {
    const rows = localProfiles.list().map((r) => (r.id === id ? { ...r, ...patch } : r))
    localProfiles.save(rows)
    return rows.find((r) => r.id === id)
  },
  remove(id) {
    localProfiles.save(localProfiles.list().filter((r) => r.id !== id))
  },
}

const remoteProfiles = {
  async list() {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },
  async create(row) {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .insert(row)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async update(id, patch) {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from(PROFILES_TABLE).delete().eq('id', id)
    if (error) throw error
  },
}

export async function listProfiles() {
  return storageMode === 'supabase' ? remoteProfiles.list() : localProfiles.list()
}
export async function createProfile(data) {
  // id генерируем на клиенте — одинаково для обоих бэкендов (text PK)
  const row = { ...data, id: uid(), created_at: new Date().toISOString() }
  return storageMode === 'supabase' ? remoteProfiles.create(row) : localProfiles.create(row)
}
export async function updateProfile(id, patch) {
  return storageMode === 'supabase'
    ? remoteProfiles.update(id, patch)
    : localProfiles.update(id, patch)
}
export async function deleteProfile(id) {
  return storageMode === 'supabase' ? remoteProfiles.remove(id) : localProfiles.remove(id)
}

// ── Каталог зелёного зерна ────────────────────────────────────
function seedBeans() {
  const now = Date.now()
  return DEFAULT_GREEN_BEANS.map((b, i) => ({
    ...b,
    created_at: new Date(now - i * 1000).toISOString(),
  }))
}

const localBeans = {
  list() {
    try {
      const raw = localStorage.getItem(BEANS_LS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignore */
    }
    const initial = seedBeans()
    localStorage.setItem(BEANS_LS_KEY, JSON.stringify(initial))
    return initial
  },
  save(rows) {
    localStorage.setItem(BEANS_LS_KEY, JSON.stringify(rows))
  },
  create(row) {
    const rows = localBeans.list()
    rows.unshift(row)
    localBeans.save(rows)
    return row
  },
  update(id, patch) {
    const rows = localBeans.list().map((r) => (r.id === id ? { ...r, ...patch } : r))
    localBeans.save(rows)
    return rows.find((r) => r.id === id)
  },
  remove(id) {
    localBeans.save(localBeans.list().filter((r) => r.id !== id))
  },
}

const remoteBeans = {
  async list() {
    const { data, error } = await supabase
      .from(BEANS_TABLE)
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  },
  async create(row) {
    const { data, error } = await supabase.from(BEANS_TABLE).insert(row).select().single()
    if (error) throw error
    return data
  },
  async update(id, patch) {
    const { data, error } = await supabase
      .from(BEANS_TABLE)
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from(BEANS_TABLE).delete().eq('id', id)
    if (error) throw error
  },
}

export async function listBeans() {
  return storageMode === 'supabase' ? remoteBeans.list() : localBeans.list()
}
export async function createBean(data) {
  const row = { ...data, id: uid(), created_at: new Date().toISOString() }
  return storageMode === 'supabase' ? remoteBeans.create(row) : localBeans.create(row)
}
export async function updateBean(id, patch) {
  return storageMode === 'supabase' ? remoteBeans.update(id, patch) : localBeans.update(id, patch)
}
export async function deleteBean(id) {
  return storageMode === 'supabase' ? remoteBeans.remove(id) : localBeans.remove(id)
}
