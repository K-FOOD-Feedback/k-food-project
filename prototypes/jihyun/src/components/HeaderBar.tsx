import worldIcon from '../assets/icon-world.svg'
import personIcon from '../assets/icon-person.svg'
import styles from './HeaderBar.module.css'

interface MainHeaderProps {
  variant: 'main'
  onWorld?: () => void
  onPerson?: () => void
}

interface DetailHeaderProps {
  variant: 'detail'
  onBack?: () => void
}

type Props = MainHeaderProps | DetailHeaderProps

export default function HeaderBar(props: Props) {
  if (props.variant === 'main') {
    return (
      <header className={`${styles.header} ${styles.end}`}>
        <div className={styles.group}>
          <button type="button" className={styles.circle} onClick={props.onWorld} aria-label="언어 선택">
            <img src={worldIcon} width={24} height={24} alt="" />
          </button>
          <button type="button" className={styles.circle} onClick={props.onPerson} aria-label="내 정보">
            <img src={personIcon} width={24} height={24} alt="" />
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className={`${styles.header} ${styles.between}`}>
      <button type="button" className={styles.circle} onClick={props.onBack} aria-label="뒤로 가기" />
      <div className={styles.group}>
        <span className={styles.circle} aria-hidden />
        <span className={styles.circle} aria-hidden />
      </div>
    </header>
  )
}
