import { useEffect, useState, type CSSProperties } from 'react'
import checkOff from '../assets/icon-check-off.svg'
import checkOn from '../assets/icon-check-on.svg'
import type { Lang } from '../data/posts'
import styles from './VoteCard.module.css'

interface VoteProps {
  mode: 'vote'
  choices: string[]
  selected: number | null
  onSelect: (index: number) => void
  onSubmit: () => void
}

interface ResultProps {
  mode: 'result'
  lang: Lang
  choices: string[]
  results: number[]
  myChoice: number | null
  onRevote?: () => void
  /** Burst of emoji confetti — only right after the user votes. */
  celebrate?: boolean
}

type Props = VoteProps | ResultProps

export default function VoteCard(props: Props) {
  if (props.mode === 'vote') {
    const { choices, selected, onSelect, onSubmit } = props
    return (
      <section className={`${styles.card} ${styles.voteCard}`}>
        <h2 className={styles.heading}>당신의 선택은?</h2>
        <div className={styles.list} role="radiogroup" aria-label="선택지">
          {choices.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={selected === i}
              className={styles.option}
              onClick={() => onSelect(i)}
            >
              <img src={selected === i ? checkOn : checkOff} width={34} height={34} alt="" />
              <span className={styles.label}>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${styles.submit} ${selected === null ? styles.submitDisabled : ''}`}
          disabled={selected === null}
          onClick={onSubmit}
        >
          투표하기
        </button>
      </section>
    )
  }

  return <Results {...props} />
}

// Within this many percentage points of the leader counts as a close race, not a clear minority.
const CLOSE_GAP = 10
// Below this many votes the result can still swing — don't call a winner yet.
const MIN_VOTES = 10

function reaction(lang: Lang, pcts: number[], total: number, myChoice: number | null): [string, string] {
  if (lang === 'en') return ['What Koreans said', `${total} votes so far`]
  if (myChoice === null) return ['투표 결과', `${total}명이 투표했어요`]
  if (total < MIN_VOTES) return ['아직 초반이에요 👀', `${total}명 투표 · 결과가 바뀔 수 있어요`]

  const top = Math.max(...pcts)
  const leaders = pcts.filter((p) => p === top).length
  const mine = pcts[myChoice]
  const runnerUp = Math.max(...pcts.filter((_, i) => i !== myChoice))

  if (mine === top && leaders > 1) return ['공동 1위! 🤝', `${mine}%로 의견이 딱 갈렸어요`]
  if (mine === top && mine - runnerUp < CLOSE_GAP) return ['박빙이에요! ⚖️', `${mine}% 대 ${runnerUp}%, 아슬아슬하게 앞서요`]
  if (mine === top) return ['다수파예요! 🙌', `${mine}%가 같은 선택을 했어요`]
  if (top - mine < CLOSE_GAP) return ['박빙이에요! ⚖️', `1위와 ${top - mine}%p 차이, 아직 몰라요`]
  return ['소수 의견! 🧐', `${mine}%만 이렇게 생각해요`]
}

// Columns left→right: 2nd, 1st, 3rd.
const PODIUM_ORDER = [1, 0, 2]
// Circle AREA follows the share of votes (diameter ∝ √%), with a floor so the text still fits.
const MIN_D = 56
const SCALE_D = 80
const diameterFor = (pct: number) => Math.round(MIN_D + SCALE_D * Math.sqrt(pct / 100))

function Results({ lang, choices, results, myChoice, onRevote, celebrate }: ResultProps) {
  const total = results.reduce((sum, n) => sum + n, 0)
  const pcts = results.map((n) => (total ? Math.round((n / total) * 100) : 0))
  const [title, subtitle] = reaction(lang, pcts, total, myChoice)

  const sorted = results.map((_, i) => i).sort((a, b) => results[b] - results[a])
  const top = Math.max(...results)
  const rowHeight = Math.max(...pcts.map(diameterFor))

  // Circles pop in on mount.
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <section className={`${styles.card} ${styles.voteCard} ${styles.resultRoot}`}>
      {celebrate && <Confetti />}
      <div className={styles.resultHead}>
        <h2 className={styles.heading}>{title}</h2>
        <p className={styles.subheading}>{subtitle}</p>
      </div>

      <ol className={styles.bubbles}>
        {PODIUM_ORDER.map((slot) => {
          const i = sorted[slot]
          if (i === undefined) return null
          const isLeader = total > 0 && results[i] === top
          const isMine = i === myChoice
          const d = diameterFor(pcts[i])
          return (
            <li key={i} className={styles.bubbleCol}>
              <div className={styles.bubbleSlot} style={{ height: rowHeight }}>
                <div
                  className={`${styles.bubble} ${isLeader ? styles.bubbleLeader : ''}`}
                  style={
                    {
                      width: d,
                      height: d,
                      '--d': `${d}px`,
                      transform: grown ? 'scale(1)' : 'scale(0)',
                      transitionDelay: `${slot * 140}ms`,
                    } as CSSProperties
                  }
                >
                  {isLeader && <Crown delay={500} />}
                  <span className={styles.bubblePct}>
                    <CountUp to={pcts[i]} run={grown} />%
                  </span>
                  <span className={styles.bubbleVotes}>
                    {results[i]}
                    {lang === 'kr' ? '명' : ' votes'}
                  </span>
                  {isMine && <span className={styles.mine}>{lang === 'kr' ? '내 선택' : 'Mine'}</span>}
                </div>
              </div>
              <span className={`${styles.bubbleLabel} ${isMine ? styles.bubbleLabelMine : ''}`}>{choices[i]}</span>
            </li>
          )
        })}
      </ol>

      {onRevote && (
        <button type="button" className={styles.submit} onClick={onRevote}>
          다시 투표하기
        </button>
      )}
    </section>
  )
}

/** Flat, outline-free crown with rounded tips — same soft blob style as the app's stickers. */
function Crown({ delay }: { delay: number }) {
  return (
    <svg
      className={styles.crown}
      style={{ animationDelay: `${delay}ms` }}
      width="46"
      height="36"
      viewBox="0 0 46 36"
      role="img"
      aria-label="1위"
    >
      <path d="M6 14 L14 22 L23 9 L32 22 L40 14 L37 31 Q36.5 33 34.5 33 L11.5 33 Q9.5 33 9 31 Z" fill="#f6b93b" />
      <circle cx="6" cy="12.5" r="4.5" fill="#f6b93b" />
      <circle cx="23" cy="7" r="5" fill="#f6b93b" />
      <circle cx="40" cy="12.5" r="4.5" fill="#f6b93b" />
      <circle cx="18" cy="25" r="1.6" fill="#1f1f1f" />
      <circle cx="28" cy="25" r="1.6" fill="#1f1f1f" />
      <path d="M20.5 28.2 Q23 30.4 25.5 28.2" stroke="#1f1f1f" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function CountUp({ to, run }: { to: number; run: boolean }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!run) return
    const start = performance.now()
    const duration = 900
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [to, run])
  return <>{value}</>
}

const CONFETTI = ['🎉', '🔥', '🌶️', '🍜', '✨', '🧀', '🥢', '💥']

// Deterministic "random" spread so renders stay pure.
const pieces = Array.from({ length: 28 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  return {
    emoji: CONFETTI[i % CONFETTI.length],
    x: Math.round((r(1) - 0.5) * 340),
    y: Math.round(-80 - r(2) * 200),
    rotate: Math.round((r(3) - 0.5) * 720),
    delay: Math.round(r(4) * 180),
    size: 18 + Math.round(r(5) * 14),
  }
})

function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={
            {
              '--x': `${p.x}px`,
              '--y': `${p.y}px`,
              '--r': `${p.rotate}deg`,
              animationDelay: `${p.delay}ms`,
              fontSize: p.size,
            } as CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}
