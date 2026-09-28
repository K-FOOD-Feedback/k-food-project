import { useEffect, type ReactNode } from 'react'
import styles from './Sheet.module.css'

interface Props {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
}

/** Dark bottom sheet shared by the login and vote sheets. */
export default function Sheet({ open, onClose, labelledBy, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.root}>
      <div className={styles.dim} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <span className={styles.handle} aria-hidden />
        {children}
      </div>
    </div>
  )
}
