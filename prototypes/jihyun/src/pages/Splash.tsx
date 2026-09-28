import { useNavigate } from 'react-router-dom'
import styles from './Splash.module.css'

export default function Splash() {
  const navigate = useNavigate()
  return (
    <main className={styles.page}>
      <h1 className={styles.headline}>
        <span>See</span>
        <span>what</span>
        <span>Koreans</span>
        <span>think.</span>
      </h1>
      <div className={styles.join}>
        <p className={styles.question}>How will you join?</p>
        <div className={styles.buttons}>
          <button type="button" className={`${styles.button} ${styles.korean}`} onClick={() => navigate('/kr')}>
            I am Korean
          </button>
          <button type="button" className={`${styles.button} ${styles.foreigner}`} onClick={() => navigate('/en')}>
            I am not Korean
          </button>
        </div>
      </div>
    </main>
  )
}
