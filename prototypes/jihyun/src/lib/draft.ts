import type { Ask } from '../data/posts'

export interface Draft {
  title: string
  body: string
  source: 'claude' | 'demo'
}

const MAX_SIDE = 1024

/** Downscale a photo (object URL) to a JPEG the API accepts without wasting tokens. */
async function toBase64Jpeg(url: string): Promise<{ media_type: 'image/jpeg'; data: string }> {
  const img = new Image()
  img.src = url
  await img.decode()
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { media_type: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}

export async function requestDraft(photos: string[], ask: Ask | null, signal?: AbortSignal): Promise<Draft> {
  const images = await Promise.all(photos.slice(0, 4).map(toBase64Jpeg))
  const res = await fetch('/api/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, ask }),
    signal,
  })
  if (!res.ok) throw new Error(`draft failed: ${res.status}`)
  return (await res.json()) as Draft
}
