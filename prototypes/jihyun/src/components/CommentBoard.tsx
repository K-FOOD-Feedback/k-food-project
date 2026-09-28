import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import Matter from 'matter-js'
import sendIcon from '../assets/icon-send.svg'
import { COMMENT_MAX, quickEmojis, type Comment, type CommentAuthor, type Lang } from '../data/posts'
import { useComments } from '../lib/comments'
import styles from './CommentBoard.module.css'

const { Engine, Bodies, Body, Composite } = Matter

// Physics world: the floor's top surface is y = 0 and the pile grows upward (negative y).
const HEADROOM = 150 // empty space kept above the pile for new comments to fall through
const STEP_MS = 1000 / 60
const PRESETTLE_STEPS = 45 // simulated frames per starter comment when the board first mounts
const MAX_TILT = 0.6 // rad (~35°): capsules tilt and tumble but never stand on end, so they stay readable

interface Props {
  postId: string
  lang: Lang
  /** Who's writing: Korean users, the post's author, or another foreigner. Keep it referentially stable. */
  viewer: CommentAuthor
  /** Fill the remaining height (full comments page) instead of a fixed-height pile. */
  fill?: boolean
  /** Shows the "see all" button under the pile. */
  onMore?: () => void
}

export default function CommentBoard({ postId, lang, viewer, fill, onMore }: Props) {
  const { comments, add } = useComments(postId, viewer)
  const [draft, setDraft] = useState('')

  const textCount = comments.filter((c) => c.kind === 'text').length
  // 공감 = every tap of one of the shortcut emojis.
  const reactionCount = comments.filter((c) => c.kind === 'emoji' && quickEmojis.includes(c.text.kr)).length

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    add('text', text.slice(0, COMMENT_MAX))
    setDraft('')
  }

  return (
    <section className={`${styles.board} ${fill ? styles.boardFill : ''}`} aria-label={lang === 'kr' ? '댓글' : 'Comments'}>
      <div className={styles.stats}>
        <Stat label={lang === 'kr' ? '댓글' : 'Comments'} value={textCount} />
        <span className={styles.statDivider} aria-hidden />
        <Stat label={lang === 'kr' ? '공감' : 'Reactions'} value={reactionCount} />
      </div>

      <Pile comments={comments} lang={lang} fill={fill} />

      {onMore && (
        <button type="button" className={styles.more} onClick={onMore}>
          {lang === 'kr' ? `댓글 전체보기 ${comments.length}` : `See all ${comments.length} comments`}
          <span aria-hidden>→</span>
        </button>
      )}

      <div className={styles.emojis}>
        {quickEmojis.map((emoji) => (
          <button key={emoji} type="button" className={styles.emoji} onClick={() => add('emoji', emoji)}>
            {emoji}
          </button>
        ))}
      </div>

      <form className={styles.inputRow} onSubmit={onSubmit}>
        <label className={styles.field}>
          <span className="visually-hidden">{lang === 'kr' ? '댓글' : 'Comment'}</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
            placeholder={lang === 'kr' ? '한 마디 남겨보세요' : 'Leave a comment'}
            maxLength={COMMENT_MAX}
          />
          <span className={styles.counter}>
            {draft.length}/{COMMENT_MAX}
          </span>
        </label>
        <button type="submit" className={styles.send} aria-label={lang === 'kr' ? '보내기' : 'Send'}>
          <img src={sendIcon} width={22} height={22} alt="" />
        </button>
      </form>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className={styles.stat}>
      {label}
      {/* Keyed by value so the number pops each time it changes. */}
      <strong key={value}>{value}</strong>
    </span>
  )
}

interface Tracked {
  body: Matter.Body
  el: HTMLElement
  w: number
  h: number
}

/**
 * The pile. Each bubble is a matter-js body (capsule or circle) and its DOM node just follows the
 * body's position/angle every frame, so capsules tumble and tilt as they land.
 */
function Pile({ comments, lang, fill }: { comments: Comment[]; lang: Lang; fill?: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLElement>())
  const tracked = useRef(new Map<string, Tracked>())
  const engineRef = useRef<Matter.Engine | null>(null)
  const size = useRef({ width: 375, height: 360 })
  const worldTop = useRef(-360)
  // Keep the newest comments in view until the user scrolls the pile themselves.
  const followTop = useRef(true)
  // On the full page the fade only shows while there are more comments below the view.
  const [moreBelow, setMoreBelow] = useState(!fill)
  const updateFade = () => {
    const viewport = viewportRef.current
    if (!fill || !viewport) return
    const next = viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 4
    setMoreBelow((prev) => (prev === next ? prev : next))
  }

  const firstRun = useRef(true)

  // Engine, walls and the render loop. A layout effect so it exists before bubbles are placed below.
  useLayoutEffect(() => {
    const viewport = viewportRef.current!
    const width = viewport.clientWidth
    const height = viewport.clientHeight
    size.current = { width, height }
    worldTop.current = -height

    const engine = Engine.create({ enableSleeping: true })
    engine.gravity.y = 1.1
    const wall = { isStatic: true, friction: 0.4 }
    Composite.add(engine.world, [
      Bodies.rectangle(width / 2, 50, width * 3, 100, wall),
      Bodies.rectangle(-50, -50000, 100, 100000, wall),
      Bodies.rectangle(width + 50, -50000, 100, 100000, wall),
    ])
    engineRef.current = engine

    let frame = 0
    const loop = () => {
      step(engine)
      render()
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    const current = tracked.current
    return () => {
      cancelAnimationFrame(frame)
      Engine.clear(engine)
      engineRef.current = null
      current.clear()
      firstRun.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const step = (engine: Matter.Engine) => {
    Engine.update(engine, STEP_MS)
    for (const { body } of tracked.current.values()) {
      if (body.circleRadius || Math.abs(body.angle) <= MAX_TILT) continue
      Body.setAngle(body, Math.sign(body.angle) * MAX_TILT)
      Body.setAngularVelocity(body, 0)
    }
  }

  // Grow the world upward as the pile rises; keep the view anchored, then glide to the top.
  const syncWorldHeight = () => {
    const viewport = viewportRef.current
    const world = worldRef.current
    if (!viewport || !world) return
    let settledTop = 0
    for (const { body } of tracked.current.values()) {
      if (body.speed < 1.5) settledTop = Math.min(settledTop, body.bounds.min.y)
    }
    const nextTop = Math.min(-size.current.height, settledTop - HEADROOM)
    const delta = worldTop.current - nextTop
    if (Math.abs(delta) < 1) return
    worldTop.current = nextTop
    world.style.height = `${-nextTop}px`
    if (delta > 0) {
      viewport.scrollTop += delta // anchor: nothing jumps…
      if (followTop.current) viewport.scrollTo({ top: 0, behavior: 'smooth' }) // …then glide up to the newest
    }
    updateFade()
  }

  const render = () => {
    syncWorldHeight()
    const top = worldTop.current
    for (const { body, el, w, h } of tracked.current.values()) {
      const x = body.position.x - w / 2
      const y = body.position.y - top - h / 2
      el.style.transform = `translate(${x}px, ${y}px) rotate(${body.angle}rad)`
    }
  }

  // Which side has more room: compare how high the pile reaches on the left vs right half.
  const pickDropX = (w: number) => {
    const { width } = size.current
    let leftTop = 0
    let rightTop = 0
    for (const { body } of tracked.current.values()) {
      if (body.position.x < width / 2) leftTop = Math.min(leftTop, body.bounds.min.y)
      else rightTop = Math.min(rightTop, body.bounds.min.y)
    }
    const goLeft = leftTop === rightTop ? Math.random() < 0.5 : leftTop > rightTop
    const half = width / 2
    const minX = goLeft ? w / 2 + 4 : half
    const maxX = goLeft ? half : width - w / 2 - 4
    return minX + Math.random() * Math.max(0, maxX - minX)
  }

  const spawn = (comment: Comment, el: HTMLElement) => {
    const engine = engineRef.current
    if (!engine) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const x = pickDropX(w)
    const y = worldTop.current + h / 2 + 4
    const common = { restitution: 0.2, friction: 0.6, frictionAir: 0.012, density: 0.002 }
    const body =
      comment.kind === 'emoji'
        ? Bodies.circle(x, y, w / 2, common)
        : Bodies.rectangle(x, y, w, h, { ...common, chamfer: { radius: Math.min(h / 2 - 1, 30) } })
    if (comment.kind === 'text') Body.setInertia(body, body.inertia * 3) // heavier to spin than a bead
    Body.setAngle(body, (Math.random() - 0.5) * 0.6)
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08)
    Composite.add(engine.world, body)
    tracked.current.set(comment.id, { body, el, w, h })
    el.style.visibility = 'visible'
    return engine
  }

  // Add bodies for comments that don't have one yet. On first mount the starters are settled
  // off-screen (simulated) so the page opens on a finished pile; later ones visibly drop in.
  useLayoutEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const fresh = comments.filter((c) => !tracked.current.has(c.id) && nodes.current.has(c.id))
    if (fresh.length === 0) return
    if (firstRun.current) {
      firstRun.current = false
      for (const c of fresh) {
        spawn(c, nodes.current.get(c.id)!)
        for (let i = 0; i < PRESETTLE_STEPS; i++) step(engine)
        syncWorldHeight()
      }
      for (let i = 0; i < 120; i++) step(engine)
      syncWorldHeight()
      viewportRef.current?.scrollTo({ top: 0 })
      render()
      return
    }
    // New comment: make sure it's in view as it falls.
    followTop.current = true
    viewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    for (const c of fresh) spawn(c, nodes.current.get(c.id)!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments])

  return (
    <div
      ref={viewportRef}
      className={`${styles.viewport} ${fill ? styles.viewportFill : ''}`}
      onWheel={() => (followTop.current = false)}
      onTouchMove={() => (followTop.current = false)}
      onScroll={updateFade}
    >
      <div ref={worldRef} className={styles.world}>
        {comments.map((c) => (
          <Bubble
            key={c.id}
            comment={c}
            lang={lang}
            ref={(el) => {
              if (el) nodes.current.set(c.id, el)
              else nodes.current.delete(c.id)
            }}
          />
        ))}
      </div>
      <div className={`${styles.fade} ${moreBelow ? '' : styles.fadeHidden}`} aria-hidden />
    </div>
  )
}

function Bubble({ comment, lang, ref }: { comment: Comment; lang: Lang; ref: (el: HTMLDivElement | null) => void }) {
  const { author } = comment
  const flag = author.kind === 'korean' ? null : author.flag
  const text = comment.text[lang]
  const lines = splitLines(text)

  if (comment.kind === 'emoji') {
    return (
      <div ref={ref} className={`${styles.bubble} ${styles.emojiBubble}`} style={{ background: comment.color }}>
        {text}
        {flag && <span className={styles.cornerFlag}>{flag}</span>}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`${styles.bubble} ${styles.textBubble} ${flag ? styles.textBubbleForeign : ''}`}
      style={{ background: comment.color }}
    >
      {flag && (
        <span className={styles.flag} aria-label={author.kind === 'author' ? 'author' : 'foreigner'}>
          {flag}
        </span>
      )}
      {author.kind === 'author' && <span className={styles.authorTag}>{lang === 'kr' ? '작성자' : 'Author'}</span>}
      <span className={styles.text}>
        {lines.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </span>
    </div>
  )
}

// Rough visual width: Hangul/CJK and emoji are about twice as wide as Latin letters.
const charWidth = (ch: string) => (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af\u4e00-\u9fff]|\p{Extended_Pictographic}/u.test(ch) ? 1 : 0.55)
const widthOf = (text: string) => Array.from(text).reduce((sum, ch) => sum + charWidth(ch), 0)
const ONE_LINE_MAX = 11 // ≈ 11 Hangul characters fit comfortably on one capsule line

/** Long comments break into two balanced lines — at a space when there is one near the middle. */
function splitLines(text: string): string[] {
  if (widthOf(text) <= ONE_LINE_MAX) return [text]
  const chars = Array.from(text)
  const half = widthOf(text) / 2
  let best = -1
  let bestScore = Infinity
  let acc = 0
  chars.forEach((ch, i) => {
    acc += charWidth(ch)
    if (i === 0 || i === chars.length - 1) return
    const imbalance = Math.abs(acc - half)
    // Prefer breaking at a space; fall back to any character if no space is close.
    const score = ch === ' ' ? imbalance : imbalance + 2
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  })
  const first = chars.slice(0, chars[best] === ' ' ? best : best + 1).join('').trim()
  const second = chars.slice(best + 1).join('').trim()
  return [first, second]
}
