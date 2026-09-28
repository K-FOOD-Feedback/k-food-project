import { useCallback, useSyncExternalStore } from 'react'
import { bubbleColors, getPost, seedCommentsFor, type Comment, type CommentAuthor } from '../data/posts'

// One shared list per post, so the pile on the detail page and the full comments page always match.
// Seeds are mock data; comments the user adds are kept in localStorage until there's an API.

const storageKey = (postId: string) => `kfood:comments:${postId}`
const cache = new Map<string, Comment[]>()
const listeners = new Set<() => void>()

function load(postId: string): Comment[] {
  const cached = cache.get(postId)
  if (cached) return cached
  let added: Comment[] = []
  try {
    added = JSON.parse(localStorage.getItem(storageKey(postId)) ?? '[]') as Comment[]
  } catch {
    // storage unavailable — start with seeds only
  }
  const list = [...seedCommentsFor(getPost(postId)), ...added]
  cache.set(postId, list)
  return list
}

function append(postId: string, comment: Comment) {
  const list = [...load(postId), comment]
  cache.set(postId, list)
  try {
    const added = list.filter((c) => !c.id.includes('-seed-'))
    localStorage.setItem(storageKey(postId), JSON.stringify(added))
  } catch {
    // keep in memory only
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useComments(postId: string, author: CommentAuthor) {
  const comments = useSyncExternalStore(subscribe, () => load(postId))

  const add = useCallback(
    (kind: Comment['kind'], text: string) => {
      const list = load(postId)
      append(postId, {
        id: `${postId}-${Date.now()}`,
        kind,
        // Mock: a real API would store the translation for the other audience.
        text: { kr: text, en: text },
        color: bubbleColors[list.length % bubbleColors.length],
        author,
      })
    },
    [postId, author],
  )

  return { comments, add }
}
