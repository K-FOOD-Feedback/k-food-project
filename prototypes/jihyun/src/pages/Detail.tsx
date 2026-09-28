import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'
import VoteCard from '../components/VoteCard'
import CommentBoard from '../components/CommentBoard'
import { askChoices, getPost, viewerFor, postTitle, type Lang } from '../data/posts'
import { usePersistentState, voteKey } from '../lib/usePersistentState'
import { useScrollHidden } from '../lib/useScrollHidden'
import styles from './Detail.module.css'

export default function Detail({ lang }: { lang: Lang }) {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const { id } = useParams()
  const post = getPost(id)
  const choices = askChoices[post.ask][lang]
  const other: Lang = lang === 'kr' ? 'en' : 'kr'

  const [showOriginal, setShowOriginal] = useState(false)
  const textLang = showOriginal ? other : lang

  const [myVote, setMyVote] = usePersistentState<number | null>(voteKey(post.id), null)
  const [selected, setSelected] = useState<number | null>(null)
  const voted = myVote !== null

  // Floating "투표하기" CTA is shown until the vote card scrolls into view.
  const voteRef = useRef<HTMLDivElement>(null)
  const [voteVisible, setVoteVisible] = useState(false)
  useEffect(() => {
    const el = voteRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVoteVisible(entry.isIntersecting), {
      rootMargin: '0px 0px -120px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Main page's "투표하러 가기" links here with #vote.
  useEffect(() => {
    if (hash !== '#vote') return
    const t = window.setTimeout(
      () => voteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      150,
    )
    return () => clearTimeout(t)
  }, [hash])

  // Hidden while reading (scrolling down) so it doesn't sit on top of the post.
  const ctaScrollHidden = useScrollHidden()
  const showFloatingCta = lang === 'kr' && !voted && !voteVisible

  // Confetti only right after voting, not when revisiting a post you already voted on.
  const [justVoted, setJustVoted] = useState(false)

  const submitVote = () => {
    if (selected === null) return
    setMyVote(selected)
    setJustVoted(true)
  }

  const revote = () => {
    setSelected(myVote)
    setMyVote(null)
    setJustVoted(false)
  }

  const openComments = () => navigate(`/${lang}/posts/${post.id}/comments`)

  return (
    <main className={styles.page}>
      <HeaderBar variant="detail" onBack={() => navigate(`/${lang}`)} />

      <div className={styles.cards}>
        <div className={styles.imageArea}>
          <img className={styles.photo} src={post.image} alt={postTitle(post, lang)} />
        </div>

        <article className={styles.postCard} style={{ background: post.color }}>
          <p className={styles.chip}>
            {lang === 'kr' ? `${post.participants}명 참여 중!` : `${post.participants} have joined!`}
          </p>
          <h1 className={textLang === 'kr' ? styles.titleKr : styles.titleEn}>
            {post.title[textLang].map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          {post.body[textLang].length > 0 && (
            <div className={textLang === 'kr' ? styles.bodyKr : styles.bodyEn}>
              {post.body[textLang].map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          <button type="button" className={styles.translate} onClick={() => setShowOriginal((v) => !v)}>
            {lang === 'kr'
              ? showOriginal
                ? '번역 보기'
                : '원본 보기'
              : showOriginal
                ? 'See original'
                : 'Translate to Korean'}
          </button>
        </article>

        <div ref={voteRef} id="vote" className={styles.voteAnchor}>
          {lang === 'en' ? (
            <VoteCard
              mode="result"
              lang="en"
              choices={choices}
              results={post.results}
              myChoice={null}
            />
          ) : voted ? (
            <VoteCard
              mode="result"
              lang="kr"
              choices={choices}
              results={post.results}
              myChoice={myVote}
              onRevote={revote}
              celebrate={justVoted}
            />
          ) : (
            <VoteCard
              mode="vote"
              choices={choices}
              selected={selected}
              onSelect={setSelected}
              onSubmit={submitVote}
            />
          )}
        </div>

        {lang === 'kr' && !voted && (
          <div className={styles.locked}>
            <p>
              투표를 완료하면
              <br />
              다른 사람들의
              <br />
              의견을 볼 수 있어요!
            </p>
          </div>
        )}
      </div>

      {(lang === 'en' || voted) && (
        <div className={styles.comments}>
          <CommentBoard postId={post.id} lang={lang} viewer={viewerFor(post, lang)} onMore={openComments} />
        </div>
      )}

      {showFloatingCta && (
        <div className={`${styles.floating} ${ctaScrollHidden ? styles.floatingHidden : ''}`}>
          <button
            type="button"
            className={styles.floatingCta}
            tabIndex={ctaScrollHidden ? -1 : 0}
            onClick={() => voteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            투표하기
          </button>
        </div>
      )}
    </main>
  )
}
