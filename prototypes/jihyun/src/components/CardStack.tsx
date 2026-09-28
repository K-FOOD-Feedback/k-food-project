import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import mask from '../assets/card-mask-front.svg'
import { askLabels, postTitle, type Lang, type Post } from '../data/posts'
import styles from './CardStack.module.css'

// Card geometry from Figma (node 241:20622), centred horizontally. The cards behind it
// are the same card scaled/rotated, so every slot is just a transform of the front card.
const CARD = { left: 31.3, top: 31.61, width: 312.4, height: 438.578, radius: 34.808 }
const IMAGE = { width: 402.251, height: 280.106, dx: 0.89, dy: -60 }
const MASK = { x: 64.255, y: 1.914, width: 272.822, height: 271.214 }

interface Place {
  x: number
  y: number
  rotate: number
  scale: number
  dim: number
  z: number
}

type Pose = Omit<Place, 'z'>

const FRONT: Pose = { x: 0, y: 0, rotate: 0, scale: 1, dim: 0 }
// Upcoming cards peek out at the top right (Figma).
const RIGHT: Pose[] = [
  { x: 19.3, y: 0.07, rotate: 2.89, scale: 0.9215, dim: 0.2 },
  { x: 34.57, y: 11.14, rotate: 4.45, scale: 0.8709, dim: 0.32 },
]
// The bottom of the deck (already-seen cards) peeks out at the bottom left.
// Index 0 is the very last card, so it sits furthest out.
const LEFT: Pose[] = [
  { x: -30, y: 20, rotate: 5.2, scale: 0.8709, dim: 0.32 },
  { x: -16, y: 9, rotate: 3.2, scale: 0.9215, dim: 0.2 },
]
const HIDDEN: Pose = { x: 0, y: 8, rotate: 0, scale: 0.85, dim: 0.32 }
// Where a card swings out to on its way to/from the back of the deck.
const ASIDE = 'translate(-250px, 28px) rotate(-14deg) scale(0.96)'

const SWIPE_THRESHOLD = 70
const TAP_TOLERANCE = 6
const SWING_MS = 260
const SETTLE_MS = 460

// out → tuck: front card swings left, then slides behind the deck (swipe left)
// emerge → land: back card swings out from behind, then lands on top (swipe right)
type Phase = 'out' | 'tuck' | 'emerge' | 'land'

interface Props {
  posts: Post[]
  lang: Lang
  index: number
  /** Posts the current user already voted on (Korean users only). */
  votedIds?: Set<string>
  onIndexChange: (index: number) => void
  onOpen: (post: Post) => void
}

/**
 * Where the card `rel` positions below the top sits in a deck of `n`.
 * Stacking always follows deck order, so the last card is always at the very back.
 */
function placeOf(rel: number, n: number): Place {
  const z = n - rel + 1
  if (rel === 0) return { ...FRONT, z }
  const rightCount = Math.min(RIGHT.length, Math.ceil((n - 1) / 2))
  const leftCount = Math.min(LEFT.length, Math.floor((n - 1) / 2))
  if (rel <= rightCount) return { ...RIGHT[rel - 1], z }
  const fromBack = n - 1 - rel
  if (fromBack < leftCount) return { ...LEFT[fromBack], z }
  return { ...HIDDEN, z }
}

const toTransform = (p: Pose) => `translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg) scale(${p.scale})`

export default function CardStack({ posts, lang, index, votedIds, onIndexChange, onOpen }: Props) {
  const n = posts.length
  const [dragX, setDragX] = useState<number | null>(null)
  const [phases, setPhases] = useState<Record<string, Phase>>({})
  const start = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null)
  const moved = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const setPhase = (id: string, phase: Phase | null) =>
    setPhases((prev) => {
      const next = { ...prev }
      if (phase) next[id] = phase
      else delete next[id]
      return next
    })

  const relOf = (i: number) => (((i - index) % n) + n) % n

  const goNext = () => {
    if (n < 2) return
    const id = posts[index].id
    setPhase(id, 'out')
    onIndexChange((index + 1) % n)
    later(SWING_MS, () => setPhase(id, 'tuck'))
    later(SWING_MS + SETTLE_MS, () => setPhase(id, null))
  }

  const goPrev = () => {
    if (n < 2) return
    const prevIndex = (index - 1 + n) % n
    const id = posts[prevIndex].id
    setPhase(id, 'emerge')
    later(SWING_MS, () => {
      setPhase(id, 'land')
      onIndexChange(prevIndex)
    })
    later(SWING_MS + SETTLE_MS, () => setPhase(id, null))
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null }
    moved.current = false
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (s.horizontal === null && Math.hypot(dx, dy) > TAP_TOLERANCE) {
      s.horizontal = Math.abs(dx) > Math.abs(dy)
      moved.current = true
      if (s.horizontal) e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (s.horizontal) setDragX(dx)
  }

  const onPointerEnd = () => {
    const dx = dragX ?? 0
    start.current = null
    setDragX(null)
    if (dx <= -SWIPE_THRESHOLD) goNext()
    else if (dx >= SWIPE_THRESHOLD) goPrev()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') goNext()
    if (e.key === 'ArrowLeft') goPrev()
  }

  const styleFor = (rel: number, phase: Phase | undefined): CSSProperties => {
    const place = placeOf(rel, n)
    const top = n + 5
    switch (phase) {
      case 'out':
        return { transform: ASIDE, zIndex: top, transition: `transform ${SWING_MS}ms ease-out` }
      case 'tuck':
        return { transform: toTransform(place), zIndex: place.z }
      case 'emerge':
        return { transform: ASIDE, zIndex: place.z, transition: `transform ${SWING_MS}ms ease-out` }
      case 'land':
        return { transform: toTransform(FRONT), zIndex: top }
    }

    const zIndex = place.z
    if (dragX !== null) {
      // Front card follows the finger to the left.
      if (rel === 0 && dragX < 0) {
        return { transform: `translate(${dragX}px, 0) rotate(${dragX / 18}deg)`, zIndex, transition: 'none' }
      }
      // The card at the very back slides out from the bottom left when pulling right.
      if (rel === n - 1 && dragX > 0 && n > 1) {
        const p = Math.min(dragX / 200, 1)
        return {
          transform: `translate(${place.x - 110 * p}px, ${place.y + 8 * p}px) rotate(${place.rotate - 12 * p}deg) scale(${place.scale + 0.04 * p})`,
          zIndex,
          transition: 'none',
        }
      }
      if (rel === 0 && dragX > 0) {
        return { transform: `translate(${dragX * 0.15}px, 0) rotate(${dragX / 60}deg)`, zIndex, transition: 'none' }
      }
    }
    return { transform: toTransform(place), zIndex }
  }

  return (
    <div
      className={styles.stage}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="K-food 콘텐츠"
    >
      {posts.map((post, i) => {
        const rel = relOf(i)
        const phase = phases[post.id]
        const isFront = rel === 0 && !phase
        const dim = phase === 'out' || phase === 'land' ? 0 : placeOf(rel, n).dim
        const style: CSSProperties = {
          left: CARD.left,
          top: CARD.top,
          width: CARD.width,
          height: CARD.height,
          borderRadius: CARD.radius,
          background: post.color,
          ...styleFor(rel, phase),
        }
        return (
          <button
            key={post.id}
            type="button"
            className={styles.card}
            style={style}
            tabIndex={isFront ? 0 : -1}
            aria-hidden={!isFront}
            aria-label={`${postTitle(post, lang)} (${i + 1}/${n})`}
            onClick={() => {
              if (isFront && !moved.current) onOpen(post)
            }}
          >
            <CardContent post={post} lang={lang} voted={votedIds?.has(post.id) ?? false} />
            <span className={styles.dim} style={{ opacity: dim / 0.32 }} />
          </button>
        )
      })}
    </div>
  )
}

function CardContent({ post, lang, voted }: { post: Post; lang: Lang; voted: boolean }) {
  const maskValue = `url("${mask}")`
  const imageStyle: CSSProperties = {
    width: IMAGE.width,
    height: IMAGE.height,
    left: `calc(50% + ${IMAGE.dx}px)`,
    top: `calc(50% + ${IMAGE.dy}px)`,
    maskImage: maskValue,
    WebkitMaskImage: maskValue,
    maskPosition: `${MASK.x}px ${MASK.y}px`,
    WebkitMaskPosition: `${MASK.x}px ${MASK.y}px`,
    maskSize: `${MASK.width}px ${MASK.height}px`,
    WebkitMaskSize: `${MASK.width}px ${MASK.height}px`,
  }
  return (
    <>
      <span className={styles.image} style={imageStyle}>
        <img src={post.cardImage} alt="" draggable={false} />
      </span>

      <span className={styles.sticker}>
        <span className={styles.stickerCount}>{post.participants}</span>
        <span className={styles.stickerLabel}>{lang === 'kr' ? '명 참여' : 'joined'}</span>
      </span>

      <span className={styles.info}>
        <span className={styles.tags}>
          {voted && <span className={styles.voted}>✓ 투표 완료</span>}
          <span className={styles.ask}>{askLabels[post.ask][lang]}</span>
        </span>
        <span className={lang === 'kr' ? styles.titleKr : styles.titleEn}>{postTitle(post, lang)}</span>
        <span className={styles.meta}>
          <span className={styles.author}>
            <span className={styles.flag}>{post.author.flag}</span>
            {lang === 'kr'
              ? `${post.author.country.kr}의 ${post.author.name}`
              : `${post.author.name} from ${post.author.country.en}`}
          </span>
          <span className={styles.comments}>💬 {post.commentCount}</span>
        </span>
      </span>
    </>
  )
}
