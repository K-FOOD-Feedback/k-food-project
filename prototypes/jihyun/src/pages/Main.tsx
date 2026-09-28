import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'
import CardStack from '../components/CardStack'
import LoginSheet, { type LoginReason } from '../components/LoginSheet'
import { posts, type Lang } from '../data/posts'
import { readStored, usePersistentState, voteKey } from '../lib/usePersistentState'
import styles from './Main.module.css'

export default function Main({ lang }: { lang: Lang }) {
  const navigate = useNavigate()
  const [index, setIndex] = usePersistentState('kfood:mainIndex', 0)
  const current = ((index % posts.length) + posts.length) % posts.length
  const currentPost = posts[current]
  const [sheet, setSheet] = useState<LoginReason | null>(null)
  const closeSheet = useCallback(() => setSheet(null), [])

  // Read once per visit; coming back from a detail page remounts this page.
  const [votedIds] = useState(
    () => new Set(posts.filter((p) => readStored<number | null>(voteKey(p.id), null) !== null).map((p) => p.id)),
  )
  const currentVoted = votedIds.has(currentPost.id)

  // TODO: hook up real Google sign-in. For now the button just continues.
  const onLogin = () => {
    const reason = sheet
    setSheet(null)
    if (reason === 'share') navigate('/en/write')
  }

  return (
    <main className={styles.page}>
      <HeaderBar variant="main" onWorld={() => navigate('/')} onPerson={() => lang === 'en' && setSheet('profile')} />
      <CardStack
        posts={posts}
        lang={lang}
        index={current}
        votedIds={lang === 'kr' ? votedIds : undefined}
        onIndexChange={setIndex}
        onOpen={(post) => navigate(`/${lang}/posts/${post.id}`)}
      />
      <div className={styles.dots} aria-hidden>
        {posts.map((p, i) => (
          <span key={p.id} className={`${styles.dot} ${i === current ? styles.dotActive : ''}`} />
        ))}
      </div>

      {lang === 'en' ? (
        <>
          <button type="button" className={styles.cta} onClick={() => setSheet('share')}>
            Share your K-food
          </button>
          <LoginSheet open={sheet !== null} reason={sheet ?? 'share'} onClose={closeSheet} onLogin={onLogin} />
        </>
      ) : (
        <button
          type="button"
          className={`${styles.cta} ${currentVoted ? styles.ctaDone : ''}`}
          onClick={() => navigate(`/kr/posts/${currentPost.id}${currentVoted ? '' : '#vote'}`)}
        >
          {currentVoted ? '투표 결과 보기' : '투표하러 가기'}
        </button>
      )}
    </main>
  )
}
