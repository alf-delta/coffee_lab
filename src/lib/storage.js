import { supabase, isSupabaseConfigured } from './supabase'
import {
  defaultScores,
  defaultLabData,
  STATUS,
  ROAST_LEVEL_LABELS,
  PROCESSING_METHODS,
  DEFAULT_BELLWETHER_PROFILES,
} from '../data/constants'

const LS_KEY = 'monoblend.batches.v3'
const TABLE = 'batches'
const PROFILES_LS_KEY = 'monoblend.profiles.v1'
const PROFILES_TABLE = 'bellwether_profiles'

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
      name: 'Ethiopia Guji Natural',
      origin: 'Эфиопия, Гуджи',
      roast_date: new Date(now - 9 * day).toISOString().slice(0, 10),
      weight_g: 1200,
      roast_level: ROAST_LEVEL_LABELS[0],
      process: PROCESSING_METHODS[1],
      outgassing_days: 7,
      status: STATUS.DONE,
      bellwether_profile_id: 'ethiopia_light_conv',
      bellwether_batch_number: 1042,
      green_weight_kg: 2.7,
      roasted_weight_kg: 2.36,
      scores: { aroma: 9, flavor: 9, aftertaste: 8, acidity: 9, body: 7, balance: 8, sweetness: 9, cleanliness: 9, uniformity: 8, overall: 9 },
      lab_data: { roast_color_whole: 86, roast_color_ground: 97, moisture: 2.1, water_activity: 0.45, true_density: 720, brew_tds: 1.38, brew_ey: 20.5 },
      notes: 'Черника, лаванда, нежный финиш. Партия-эталон сезона.',
      transcript: '',
      analyzed_at: new Date(now - 1 * day).toISOString(),
      created_at: new Date(now - 9 * day).toISOString(),
    },
    {
      id: uid(),
      name: 'Colombia Huila Washed',
      origin: 'Колумбия, Уила',
      roast_date: new Date(now - 4 * day).toISOString().slice(0, 10),
      weight_g: 900,
      roast_level: ROAST_LEVEL_LABELS[2],
      process: PROCESSING_METHODS[0],
      outgassing_days: 10,
      status: STATUS.OUTGASSING,
      bellwether_profile_id: 'colombia_med_sweet',
      bellwether_batch_number: 1043,
      green_weight_kg: 2.7,
      roasted_weight_kg: 2.34,
      scores: defaultScores(),
      lab_data: { ...defaultLabData(), roast_color_whole: 70, roast_color_ground: 80, moisture: 3.2, water_activity: 0.52, true_density: 690 },
      notes: '',
      transcript: '',
      created_at: new Date(now - 4 * day).toISOString(),
    },
    {
      id: uid(),
      name: 'Kenya Nyeri AA',
      origin: 'Кения, Ньери',
      roast_date: new Date(now - 12 * day).toISOString().slice(0, 10),
      weight_g: 750,
      roast_level: ROAST_LEVEL_LABELS[1],
      process: PROCESSING_METHODS[0],
      outgassing_days: 8,
      status: STATUS.OUTGASSING,
      scores: defaultScores(),
      lab_data: { ...defaultLabData(), roast_color_whole: 80, roast_color_ground: 60, moisture: 4.3, water_activity: 0.58, true_density: 705 },
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
