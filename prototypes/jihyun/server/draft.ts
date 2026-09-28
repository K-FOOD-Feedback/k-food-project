import Anthropic from '@anthropic-ai/sdk'

export type Ask = 'authentic' | 'appeal' | 'improve'

export interface DraftImage {
  media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  data: string // base64, no data: prefix
}

export interface DraftRequest {
  images: DraftImage[]
  ask: Ask | null
}

export interface Draft {
  title: string
  body: string
  source: 'claude' | 'demo'
}

export const TITLE_MAX = 40
export const BODY_MAX = 300

const askPrompt: Record<Ask, string> = {
  authentic: 'They want to know whether it is authentically Korean-style.',
  appeal: 'They want to know whether Koreans would want to eat it.',
  improve: 'They want tips on what to fix or improve.',
}

const SYSTEM = `You write short posts for a K-food community app. Foreign home cooks upload photos of Korean food they made, and Korean users vote and comment on it.

Write the post in the first person, as the cook, in casual friendly English. Describe only what is actually visible in the photos (the dish, toppings, plating); do not invent ingredients or backstory you can't see. End the body with a question to Korean readers that matches what the cook wants to know.

Title: at most ${TITLE_MAX} characters, catchy, phrased as a question to Koreans when natural.
Body: at most ${BODY_MAX} characters, 2-4 short sentences, one line per sentence (separate with \\n). No hashtags.`

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: `Post title, at most ${TITLE_MAX} characters` },
    body: { type: 'string', description: `Post body, at most ${BODY_MAX} characters` },
  },
  required: ['title', 'body'],
  additionalProperties: false,
}

const client = new Anthropic()
let warnedNoCredentials = false

export async function generateDraft(req: DraftRequest): Promise<Draft> {
  if (req.images.length === 0) return demoDraft(req.ask)
  try {
    return await callClaude(req)
  } catch (err) {
    // No API key / profile configured (the SDK throws a plain Error before sending), or the key is
    // rejected: keep the write screen usable with a demo draft. Anything else is a real failure.
    const configError = !(err instanceof Anthropic.APIError) && !(err instanceof SyntaxError)
    if (err instanceof Anthropic.AuthenticationError || configError) {
      if (!warnedNoCredentials) {
        console.warn(`[draft] Claude unavailable, using demo drafts: ${(err as Error).message}`)
        warnedNoCredentials = true
      }
      return demoDraft(req.ask)
    }
    throw err
  }
}

async function callClaude(req: DraftRequest): Promise<Draft> {

  const instruction = req.ask
    ? `Write my post. ${askPrompt[req.ask]}`
    : 'Write my post. End by asking Koreans what they think.'

  const response = await client.beta.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          ...req.images.slice(0, 4).map((img) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: img.media_type, data: img.data },
          })),
          { type: 'text', text: instruction },
        ],
      },
    ],
  })

  if (response.stop_reason === 'refusal') return demoDraft(req.ask)

  const text = response.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') return demoDraft(req.ask)

  const parsed = JSON.parse(text.text) as { title: string; body: string }
  return {
    title: parsed.title.slice(0, TITLE_MAX),
    body: parsed.body.slice(0, BODY_MAX),
    source: 'claude',
  }
}

function demoDraft(ask: Ask | null): Draft {
  const question: Record<Ask, string> = {
    authentic: 'Is this how you make it in Korea?',
    appeal: 'Would you want to eat this?',
    improve: 'What should I change next time?',
  }
  return {
    title: 'What do you think of my K-food?',
    body: [
      'I made this at home for the first time :)',
      'I tried to keep it as Korean as I could.',
      ask ? question[ask] : 'What do you think?',
    ].join('\n'),
    source: 'demo',
  }
}
