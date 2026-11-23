import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { checkConnection } from './config/index.js'

// Import route handlers
import participantsRoutes from './routes/participants.js'
import attendanceRoutes from './routes/attendance.js'
import foodRoutes from './routes/food.js'
import gamesRoutes from './routes/games.js'
import commentsRoutes from './routes/comments.js'
// Bus routes
import busRoutes from './routes/bus.js'
import qrRoutes from './routes/qr.js'
import qrEmailRoutes from './routes/qr-email.js'
import importRoutes from './routes/import.js'
import registerRoutes from './routes/register.js'
import analyticsRoutes from './routes/analytics.js'
import authRoutes from './routes/auth.js'
import clearTrackingRoutes from './routes/clear-tracking.js'
import scanAnalyticsRoutes from './routes/scan-analytics.js'
import { requireAuth, requireAccess, byMethod } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// CORS configuration - allow multiple frontend ports for development
const allowedOrigins = [
  FRONTEND_URL,
  // Extra allowed sites, comma-separated (e.g. a custom domain for the '27 portal)
  ...(process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5175',
  'http://10.2.144.168:5173',
  'https://reg.nimuneg.org'
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin) || 
        origin?.startsWith('http://localhost:') || 
        origin?.startsWith('http://127.0.0.1:') ||
        origin?.startsWith('http://10.') ||
        origin?.startsWith('http://192.168.') ||
        origin?.startsWith('http://172.') ||
        origin?.endsWith('.nimuneg.org') || 
        origin?.endsWith('.vercel.app')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Root route - API information
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'NIMUN\'26 Registration System API',
    version: '1.0.1-DEBUG',
    endpoints: {
      health: '/health',
      participants: '/api/participants',
      attendance: '/api/attendance',
      food: '/api/food',
      games: '/api/games',
      comments: '/api/comments',
      qr: '/api/qr',
      register: '/api/register',
      import: '/api/import',
      analytics: '/api/analytics',
      auth: '/api/auth',
      admin: '/api/admin/clear-tracking'
    },
    documentation: 'See README.md for API documentation'
  })
})

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await checkConnection()
  const { getConnectionStatus } = await import('./config/index.js')
  res.json({
    status: 'ok',
    database: dbOk ? 'connected' : 'unavailable',
    connectionStatus: getConnectionStatus(),
    timestamp: new Date().toISOString()
  })
})

// API Routes
// /api/auth handles its own checks (login is public, verify/logout need a token).
app.use('/api/auth', authRoutes)

// Every other API route needs a valid server-side session.
app.use('/api', requireAuth)

const FULL = requireAccess('full')
const SCAN = requireAccess('full', 'scan')

// Scanning: look people up and record check-ins
app.use('/api/participants', byMethod(['full', 'scan'], ['full']), participantsRoutes)
app.use('/api/attendance', SCAN, attendanceRoutes)
app.use('/api/food', SCAN, foodRoutes)
app.use('/api/games', SCAN, gamesRoutes)
app.use('/api/comments', SCAN, commentsRoutes)
app.use('/api/bus', SCAN, busRoutes)

// Scan analytics: Press Head and Secretariats see only their own council
app.use('/api/scan-analytics', requireAccess('full', 'analytics'), scanAnalyticsRoutes)

// Full power only (Highboard, Registration Affairs)
app.use('/api/qr-email', FULL, qrEmailRoutes)
app.use('/api/qr', FULL, qrRoutes)
app.use('/api/import', FULL, importRoutes)
app.use('/api/register', FULL, registerRoutes)
app.use('/api/analytics', FULL, analyticsRoutes)
app.use('/api/admin/clear-tracking', FULL, clearTrackingRoutes)

// Start server
// On Vercel the app runs as a serverless function (api/index.js), not a server.
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`)
    console.log(`📡 Frontend URL: ${FRONTEND_URL}`)
  })
}

export default app
