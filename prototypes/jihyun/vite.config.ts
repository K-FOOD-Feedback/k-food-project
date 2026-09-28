import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { generateDraft, type DraftRequest } from './server/draft.ts'

// Dev-only API: POST /api/draft → AI-written title/body for the uploaded photos.
// In production this handler moves to your backend / serverless function.
function draftApi(): Plugin {
  return {
    name: 'kfood-draft-api',
    configureServer(server) {
      server.middlewares.use('/api/draft', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let raw = ''
        req.on('data', (chunk) => (raw += chunk))
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const draft = await generateDraft(JSON.parse(raw) as DraftRequest)
            res.end(JSON.stringify(draft))
          } catch (err) {
            server.config.logger.error(`[draft] ${err instanceof Error ? err.message : String(err)}`)
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'draft_failed' }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make ANTHROPIC_API_KEY from .env.local visible to the server-side handler.
  Object.assign(process.env, loadEnv(mode, process.cwd(), 'ANTHROPIC_'))
  return {
    plugins: [react(), draftApi()],
  }
})
