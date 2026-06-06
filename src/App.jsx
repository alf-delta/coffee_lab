import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Coffee, Database, HardDrive, SlidersHorizontal, X } from 'lucide-react'
import StatsBar from './components/StatsBar'
import CalendarPanel from './components/CalendarPanel'
import BatchCard from './components/BatchCard'
import AddBatchModal from './components/AddBatchModal'
import BatchDetail from './components/BatchDetail'
import ProfilesModal from './components/ProfilesModal'
import {
  listBatches, createBatch, updateBatch, deleteBatch,
  listProfiles, createProfile, updateProfile, deleteProfile,
  storageMode,
} from './lib/storage'
import { effectiveStatus, readyDate, formatDate } from './lib/outgassing'
import { STATUS } from './data/constants'

const pad = (n) => String(n).padStart(2, '0')
const keyOfDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
// дни-события партии: обжарка + дата готовности к анализу
const batchEventDays = (b) => {
  const days = []
  if (b.roast_date) days.push(String(b.roast_date).slice(0, 10))
  days.push(keyOfDate(readyDate(b.roast_date, b.outgassing_days)))
  return days
}

export default function App() {
  const [batches, setBatches] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState(null)
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [profilesOpen, setProfilesOpen] = useState(false)

  // Рубрикатор и календарь взаимоисключающие
  const selectStatus = (key) => {
    setSelectedDay(null)
    setFilter(key)
  }
  const selectDay = (key) => {
    setFilter('all')
    setSelectedDay(key)
  }

  useEffect(() => {
    Promise.all([listBatches(), listProfiles()])
      .then(([b, p]) => {
        setBatches(b)
        setProfiles(p)
      })
      .catch((e) => console.error('Ошибка загрузки', e))
      .finally(() => setLoading(false))
  }, [])

  // обогащаем эффективным статусом (авто по дате)
  const enriched = useMemo(
    () => batches.map((b) => ({ ...b, _status: effectiveStatus(b) })),
    [batches]
  )

  const visible = useMemo(() => {
    if (selectedDay) return enriched.filter((b) => batchEventDays(b).includes(selectedDay))
    return filter === 'all' ? enriched : enriched.filter((b) => b._status === filter)
  }, [enriched, filter, selectedDay])

  const openBatch = enriched.find((b) => b.id === openId) || null

  // ── мутации с оптимистичным обновлением ───────────────────
  const handleCreate = async (data) => {
    setAdding(false)
    const tmpId = 'tmp-' + Date.now()
    setBatches((prev) => [{ ...data, id: tmpId, _optimistic: true }, ...prev])
    try {
      const row = await createBatch(data)
      setBatches((prev) => prev.map((b) => (b.id === tmpId ? row : b)))
    } catch (e) {
      console.error(e)
      setBatches((prev) => prev.filter((b) => b.id !== tmpId))
    }
  }

  const handleUpdate = async (id, patch) => {
    setBatches((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    try {
      await updateBatch(id, patch)
    } catch (e) {
      console.error('Не удалось сохранить', e)
    }
  }

  const handleDelete = async (batch) => {
    if (!confirm(`Удалить партию «${batch.name}»? Действие необратимо.`)) return
    setBatches((prev) => prev.filter((b) => b.id !== batch.id))
    if (openId === batch.id) setOpenId(null)
    try {
      await deleteBatch(batch.id)
    } catch (e) {
      console.error(e)
    }
  }

  // ── CRUD профилей Bellwether ──────────────────────────────
  const handleProfileCreate = async (data) => {
    try {
      const row = await createProfile(data)
      setProfiles((prev) => [...prev, row])
    } catch (e) {
      console.error(e)
    }
  }
  const handleProfileUpdate = async (id, patch) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    try {
      await updateProfile(id, patch)
    } catch (e) {
      console.error(e)
    }
  }
  const handleProfileDelete = async (id) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    try {
      await deleteProfile(id)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      {/* шапка */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <img
          src="/logo.svg"
          alt="Monoblend"
          width="841"
          height="462"
          className="h-15 w-auto sm:h-18"
        />

        <div className="flex items-center gap-3">
          <span
            className="hidden items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-xs text-coffee-soft sm:inline-flex"
            title={storageMode === 'supabase' ? 'Данные в Supabase' : 'Данные в localStorage'}
          >
            {storageMode === 'supabase' ? <Database size={13} /> : <HardDrive size={13} />}
            {storageMode === 'supabase' ? 'Supabase' : 'Локально'}
          </span>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setProfilesOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-coffee/15 bg-white/50 px-4 py-3 text-sm font-medium text-coffee transition hover:bg-white/80"
          >
            <SlidersHorizontal size={17} />
            <span className="hidden sm:inline">Профили</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setAdding(true)}
            className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-105"
          >
            <Plus size={18} /> Новая партия
          </motion.button>
        </div>
      </header>

      {/* статистика-фильтры: клик по виджету фильтрует список */}
      <div className="mb-8">
        <StatsBar batches={enriched} active={selectedDay ? null : filter} onSelect={selectStatus} />
      </div>

      {/* календарь + список */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <CalendarPanel
          batches={enriched}
          selected={selectedDay}
          onSelect={selectDay}
          className="lg:w-80 lg:shrink-0"
        />

        <div className="min-w-0 flex-1">
          {/* активный день из календаря */}
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="glass-soft mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-coffee transition hover:bg-white/70"
            >
              События за {formatDate(selectedDay)}
              <X size={15} className="text-coffee-soft" />
              <span className="text-coffee-soft">показать все</span>
            </button>
          )}

          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass-soft h-[72px] animate-pulse rounded-full" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState filter={filter} selectedDay={selectedDay} onAdd={() => setAdding(true)} />
          ) : (
            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {visible.map((b) => (
                  <BatchCard
                    key={b.id}
                    batch={b}
                    onOpen={(x) => setOpenId(x.id)}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* модалки */}
      <AddBatchModal
        open={adding}
        profiles={profiles}
        onClose={() => setAdding(false)}
        onCreate={handleCreate}
        onManageProfiles={() => {
          setAdding(false)
          setProfilesOpen(true)
        }}
      />
      <BatchDetail
        batch={openBatch}
        profiles={profiles}
        onClose={() => setOpenId(null)}
        onUpdate={handleUpdate}
      />
      <ProfilesModal
        open={profilesOpen}
        profiles={profiles}
        onClose={() => setProfilesOpen(false)}
        onCreate={handleProfileCreate}
        onUpdate={handleProfileUpdate}
        onDelete={handleProfileDelete}
      />
    </div>
  )
}

function EmptyState({ filter, selectedDay, onAdd }) {
  const isAll = filter === 'all' && !selectedDay
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-soft grid place-items-center rounded-[1.75rem] px-6 py-16 text-center"
    >
      <span className="mb-4 grid size-16 place-items-center rounded-3xl bg-coffee/8 text-coffee">
        <Coffee size={30} />
      </span>
      <h3 className="font-display text-2xl text-espresso">
        {selectedDay ? 'На этот день событий нет' : isAll ? 'Пока нет партий' : 'Здесь пусто'}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-coffee-soft">
        {selectedDay
          ? 'Выберите другой день или сбросьте фильтр календаря.'
          : isAll
            ? 'Добавьте первую обжаренную партию, чтобы начать вести журнал и оценки.'
            : 'Нет партий с этим статусом. Смените фильтр или добавьте новую партию.'}
      </p>
      {isAll && (
        <button
          onClick={onAdd}
          className="btn-gold mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
        >
          <Plus size={16} /> Добавить партию
        </button>
      )}
    </motion.div>
  )
}
