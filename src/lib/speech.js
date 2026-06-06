// Обёртка над Web Speech API (распознавание речи в браузере).
const SR =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export const isSpeechSupported = Boolean(SR)

export function createRecognizer({ lang = 'ru-RU', onResult, onError, onEnd } = {}) {
  if (!SR) return null
  const rec = new SR()
  rec.lang = lang
  rec.continuous = true
  rec.interimResults = true

  rec.onresult = (e) => {
    let finalText = ''
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) finalText += t
      else interim += t
    }
    onResult?.({ finalText, interim })
  }
  rec.onerror = (e) => onError?.(e.error || 'speech-error')
  rec.onend = () => onEnd?.()
  return rec
}
