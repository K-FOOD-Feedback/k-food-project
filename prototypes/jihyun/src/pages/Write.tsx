import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import closeIcon from '../assets/icon-close.svg'
import checkOff from '../assets/icon-check-off.svg'
import checkOn from '../assets/icon-check-on.svg'
import { addPost, askLabels, type Ask } from '../data/posts'
import { requestDraft } from '../lib/draft'
import styles from './Write.module.css'

const MAX_PHOTOS = 10
const TITLE_MAX = 40
const BODY_MAX = 300
const asks = Object.keys(askLabels) as Ask[]

export default function Write() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialPhotos = (location.state as { photos?: string[] } | null)?.photos ?? []

  const [photos, setPhotos] = useState<string[]>(initialPhotos)
  const [ask, setAsk] = useState<Ask | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  // AI draft: written from the photos, then freely editable.
  const [drafting, setDrafting] = useState(false)
  const [aiFilled, setAiFilled] = useState(false)
  const [edited, setEdited] = useState(false)
  const draftAbort = useRef<AbortController | null>(null)

  const writeDraft = useCallback(async (forPhotos: string[], forAsk: Ask | null) => {
    draftAbort.current?.abort()
    const controller = new AbortController()
    draftAbort.current = controller
    setDrafting(true)
    try {
      const draft = await requestDraft(forPhotos, forAsk, controller.signal)
      setTitle(draft.title.slice(0, TITLE_MAX))
      setBody(draft.body.slice(0, BODY_MAX))
      setAiFilled(true)
      setEdited(false)
    } catch (err) {
      // Leave the fields empty so the user can write it themselves.
      if (!controller.signal.aborted) console.error(err)
    } finally {
      if (draftAbort.current === controller) setDrafting(false)
    }
  }, [])

  useEffect(() => () => draftAbort.current?.abort(), [])

  // First photos in → write a draft (only while the text is still empty).
  const hasPhotos = photos.length > 0
  useEffect(() => {
    if (hasPhotos && !aiFilled && !title && !body) void writeDraft(photos, ask)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhotos])

  const chooseAsk = (next: Ask) => {
    setAsk(next)
    // The question at the end of the draft depends on this — refresh it if the user hasn't edited yet.
    if (aiFilled && !edited && hasPhotos) void writeDraft(photos, next)
  }

  const canSubmit =
    !drafting && photos.length > 0 && ask !== null && title.trim().length > 0 && body.trim().length > 0

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setPhotos((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))].slice(0, MAX_PHOTOS))
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || ask === null) return
    const id = addPost({ photos, ask, title: title.trim(), body: body.trim() })
    navigate(`/en/posts/${id}`, { replace: true })
  }

  const openPicker = () => fileInput.current?.click()

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.circle} onClick={() => navigate('/en')} aria-label="Close">
          <img src={closeIcon} width={24} height={24} alt="" />
        </button>
      </header>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.intro}>
          <h1 className={styles.headline}>
            <span>Share your</span>
            <span>K-food.</span>
          </h1>
          <p className={styles.lead}>Koreans will vote on it and leave comments.</p>
        </div>

        {/* Photos */}
        <section className={styles.section}>
          <h2 className={styles.label}>
            Photos <span className={styles.count}>{photos.length}/{MAX_PHOTOS}</span>
          </h2>
          {photos.length === 0 ? (
            <button type="button" className={styles.dropzone} onClick={openPicker}>
              <span className={styles.cameraBadge}>
                <CameraIcon />
              </span>
              <span className={styles.dropTitle}>Add photos</span>
              <span className={styles.dropHint}>The first photo becomes your card cover</span>
            </button>
          ) : (
            <div className={styles.thumbs}>
              {photos.map((src, i) => (
                <div key={src} className={styles.thumb}>
                  <img src={src} alt={`Photo ${i + 1}`} />
                  {i === 0 && <span className={styles.cover}>Cover</span>}
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => setPhotos((prev) => prev.filter((p) => p !== src))}
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <img src={closeIcon} width={14} height={14} alt="" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button type="button" className={`${styles.thumb} ${styles.addThumb}`} onClick={openPicker} aria-label="Add photos">
                  <CameraIcon />
                </button>
              )}
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="visually-hidden"
            tabIndex={-1}
            onChange={onFiles}
          />
        </section>

        {/* What to ask Koreans */}
        <section className={styles.section}>
          <h2 className={styles.label}>What do you want to know?</h2>
          <div className={styles.options} role="radiogroup" aria-label="What do you want to know?">
            {asks.map((key) => {
              const selected = ask === key
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`${styles.option} ${selected ? styles.optionOn : ''}`}
                  onClick={() => chooseAsk(key)}
                >
                  <img src={selected ? checkOn : checkOff} width={34} height={34} alt="" />
                  <span>{askLabels[key].en}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Title */}
        <section className={styles.section}>
          <label className={styles.label} htmlFor="write-title">
            Title
          </label>
          <div className={`${styles.field} ${drafting ? styles.fieldLoading : ''}`}>
            <input
              id="write-title"
              className={styles.input}
              value={title}
              maxLength={TITLE_MAX}
              disabled={drafting}
              placeholder={drafting ? 'Writing…' : 'e.g. What do you think of my Buldak?'}
              onChange={(e) => {
                setTitle(e.target.value)
                setEdited(true)
              }}
            />
            <span className={styles.counter}>
              {title.length}/{TITLE_MAX}
            </span>
          </div>
        </section>

        {/* Description */}
        <section className={styles.section}>
          <label className={styles.label} htmlFor="write-body">
            Tell us more
          </label>
          <div className={`${styles.field} ${drafting ? styles.fieldLoading : ''}`}>
            <textarea
              id="write-body"
              className={styles.textarea}
              value={body}
              maxLength={BODY_MAX}
              disabled={drafting}
              placeholder={drafting ? 'Writing…' : 'How did you make it? What are you curious about?'}
              onChange={(e) => {
                setBody(e.target.value)
                setEdited(true)
              }}
            />
            <span className={styles.counter}>
              {body.length}/{BODY_MAX}
            </span>
          </div>
        </section>

        <div className={styles.bottom}>
          <p className={styles.note}>
            <span aria-hidden>ⓘ</span> AI writes a draft from your photos. It can make mistakes, so feel free
            to edit it.
          </p>
          <button type="submit" className={styles.cta} disabled={!canSubmit}>
            Post it
          </button>
        </div>
      </form>
    </main>
  )
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.2 4.5h5.6l1.4 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h2.8l1.4-2Z"
        fill="currentColor"
      />
      <circle cx="12" cy="13" r="3.6" fill="var(--camera-lens, #111)" />
    </svg>
  )
}
