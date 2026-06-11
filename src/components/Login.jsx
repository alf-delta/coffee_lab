import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, Loader2, Mail, Lock } from 'lucide-react'
import { signIn } from '../lib/auth'

const field =
  'w-full rounded-2xl border border-white/60 bg-white/55 py-3 pl-11 pr-4 text-sm text-espresso outline-none transition focus:border-gold/60 focus:bg-white/80 focus:ring-2 focus:ring-gold/25 placeholder:text-coffee-soft/50'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
      // onAuthChange в App сам перерисует на приложение
    } catch (err) {
      const msg = String(err?.message || err)
      setError(
        /invalid login credentials/i.test(msg)
          ? 'Неверная почта или пароль'
          : /email not confirmed/i.test(msg)
            ? 'Почта не подтверждена'
            : msg
      )
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
        className="glass w-full max-w-sm rounded-[1.75rem] p-7 sm:p-8"
      >
        <img
          src="/logo.svg"
          alt="Monoblend"
          width="841"
          height="462"
          className="mx-auto h-12 w-auto"
        />
        <p className="mt-3 text-center text-sm text-coffee-soft">
          Кофейная лаборатория · вход для сотрудников
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-soft/60" />
            <input
              type="email"
              autoComplete="email"
              autoFocus
              className={field}
              placeholder="почта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-soft/60" />
            <input
              type="password"
              autoComplete="current-password"
              className={field}
              placeholder="пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-center text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="btn-gold mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition hover:brightness-105 disabled:opacity-40"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}
            {busy ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-coffee-soft/70">
          Доступ по приглашению. Аккаунт заводит администратор лаборатории.
        </p>
      </motion.div>
    </div>
  )
}
