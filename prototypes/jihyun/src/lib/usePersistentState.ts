import { useEffect, useState } from 'react'

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStored(key, initial))

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable (private mode etc.) — keep in-memory state only
    }
  }, [key, value])

  return [value, setValue] as const
}

/** Storage key for the current user's vote on a post (choice index or null). */
export const voteKey = (postId: string) => `kfood:vote:${postId}`
