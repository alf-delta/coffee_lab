import { supabase, isSupabaseConfigured } from './supabase'

// Авторизация активна только в supabase-режиме. В local-режиме (нет ключей)
// гейт отключён — приложение открывается сразу (локальная разработка).
export const authEnabled = isSupabaseConfigured

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

// Подписка на изменения сессии. Возвращает функцию отписки.
export function onAuthChange(cb) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
