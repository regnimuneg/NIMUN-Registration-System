// Vercel entry point: the whole Express API runs as one serverless function.
// `npm run build` compiles src/ to dist/ first (see vercel.json).
import app from '../dist/index.js'

export default app
