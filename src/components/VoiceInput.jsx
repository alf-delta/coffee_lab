import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Sparkles, Loader2, Keyboard } from 'lucide-react'
import { createRecognizer, isSpeechSupported } from '../lib/speech'
import { parseCupping } from '../lib/parseCupping'

export default function VoiceInput({ onParsed }) {
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [parsing, setParsing] = useState(false)
  const [source, setSource] = useState(null)
  const [error, setError] = useState('')
  const recRef = useRef(null)

  useEffect(() => () => recRef.current?.abort?.(), [])

  const start = () => {
    setError('')
    const rec = createRecognizer({
      onResult: ({ finalText, interim }) => {
        if (finalText) setText((t) => (t ? t + ' ' : '') + finalText.trim())
        setInterim(interim)
      },
      onError: (e) => {
        setError(e === 'not-allowed' ? 'Нет доступа к микрофону' : 'Ошибка распознавания')
        setListening(false)
      },
      onEnd: () => {
        setInterim('')
        setListening(false)
      },
    })
    if (!rec) return
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  const stop = () => {
    recRef.current?.stop?.()
    setListening(false)
  }

  const analyze = async () => {
    const full = (text + ' ' + interim).trim()
    if (!full) return
    setParsing(true)
    setError('')
    try {
      const result = await parseCupping(full)
      setSource(result.source)
      onParsed?.(result, full)
    } catch {
      setError('Не удалось разобрать. Попробуйте ещё раз.')
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="glass-dark rounded-[1.5rem] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-gold-soft" />
        <h4 className="font-display text-lg text-cream">Голосовой ввод наблюдений</h4>
      </div>

      <div className="flex items-center gap-3">
        {isSpeechSupported ? (
          <motion.button
            type="button"
            onClick={listening ? stop : start}
            whileTap={{ scale: 0.94 }}
            className="relative grid size-14 shrink-0 place-items-center rounded-full text-white"
            style={{
              background: listening
                ? 'linear-gradient(135deg,#d4584f,#b03a32)'
                : 'linear-gradient(135deg,#d9ad4f,#b07d2b)',
              boxShadow: '0 8px 22px -6px rgba(176,125,43,0.6)',
            }}
            aria-label={listening ? 'Остановить запись' : 'Начать запись'}
          >
            {listening && (
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: '2px solid rgba(212,88,79,0.6)' }}
                animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
              />
            )}
            {listening ? <Square size={20} fill="white" /> : <Mic size={22} />}
          </motion.button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-latte">
            <Keyboard size={15} /> Микрофон недоступен — введите текст вручную ниже
          </div>
        )}

        <div className="text-sm text-latte">
          {listening ? (
            <span className="flex items-center gap-1.5">
              <span className="size-2 animate-pulse rounded-full bg-red-500" />
              Слушаю… говорите наблюдения
            </span>
          ) : (
            'Нажмите и опишите партию вслух'
          )}
        </div>
      </div>

      <textarea
        value={text + (interim ? ' ' + interim : '')}
        onChange={(e) => {
          setText(e.target.value)
          setInterim('')
        }}
        rows={3}
        placeholder="…или вставьте/наберите текст наблюдений здесь"
        className="field-dark mt-4 w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none transition"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.span
              key="err"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="text-xs text-red-300"
            >
              {error}
            </motion.span>
          ) : source ? (
            <motion.span
              key="src"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-latte"
            >
              {source === 'claude'
                ? '✓ Разобрано через Claude'
                : '✓ Разобрано локально (без AI-сервера)'}
            </motion.span>
          ) : (
            <span />
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={analyze}
          disabled={parsing || !(text + interim).trim()}
          className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:brightness-105 disabled:opacity-40"
        >
          {parsing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {parsing ? 'Разбираю…' : 'Разобрать и заполнить'}
        </button>
      </div>
    </div>
  )
}
