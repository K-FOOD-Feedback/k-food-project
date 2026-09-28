import { useLocation, useNavigate, useParams } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'
import CommentBoard from '../components/CommentBoard'
import { getPost, postTitle, viewerFor } from '../data/posts'
import styles from './Comments.module.css'

export default function Comments() {
  const navigate = useNavigate()
  const { id } = useParams()
  const lang = useLocation().pathname.startsWith('/en') ? 'en' : 'kr'
  const post = getPost(id)

  return (
    <main className={styles.page}>
      <HeaderBar variant="detail" onBack={() => navigate(`/${lang}/posts/${post.id}`)} />
      <h1 className={styles.title}>{postTitle(post, lang)}</h1>
      <div className={styles.board}>
        <CommentBoard postId={post.id} lang={lang} viewer={viewerFor(post, lang)} fill />
      </div>
    </main>
  )
}
