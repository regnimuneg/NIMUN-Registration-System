import { Pool, type QueryResultRow } from 'pg'

// Database connection configuration
// Supports multiple connection methods:
// 1. Full connection string: DATABASE_URL (highest priority)
// 2. Individual variables: SUPABASE_URL + DB_PASSWORD (for direct connection)
// 3. Pooler connection: SUPABASE_URL + DB_PASSWORD (for pooler)

const databaseUrl = process.env.DATABASE_URL // Full connection string (optional)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbPassword = process.env.DB_PASSWORD // Database password for PostgreSQL connection

// Extract project reference from SUPABASE_URL
// Format: https://[PROJECT-REF].supabase.co
let projectRef: string | undefined
if (supabaseUrl) {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  projectRef = match ? match[1] : undefined
}

// Construct database connection string
// Priority: 1. DATABASE_URL (if provided), 2. Individual variables
let connectionString: string | undefined
let connectionType: string = 'unknown'

if (databaseUrl) {
  // Use full connection string if provided
  connectionString = databaseUrl
  connectionType = 'connection_string'
  console.log(`📡 Database: Using provided DATABASE_URL connection string`)
} else if (projectRef && dbPassword) {
  // Try pooler connection first (more reliable)
  // Format: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-[N]-[REGION].pooler.supabase.com:5432/postgres
  // Common regions: us-east-1, eu-central-1, etc.
  // Try common pooler endpoints
  const poolerHosts = [
    `aws-1-eu-central-1.pooler.supabase.com`, // EU Central (most common)
    `aws-0-us-east-1.pooler.supabase.com`,     // US East
    `aws-0-ap-southeast-1.pooler.supabase.com` // Asia Pacific
  ]
  
  // Use the first pooler host (you can specify which one in your connection string)
  connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@${poolerHosts[0]}:5432/postgres`
  connectionType = 'pooler'
  console.log(`📡 Database: Attempting pooler connection to ${poolerHosts[0]}:5432`)
  console.log(`   User: postgres.${projectRef}`)
} else if (projectRef && dbPassword) {
  // Fallback to direct connection
  connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`
  connectionType = 'direct'
  console.log(`📡 Database: Attempting direct connection to db.${projectRef}.supabase.co:5432`)
} else {
  console.error('❌ Database: Connection cannot be established!')
  if (!projectRef) {
    console.error('   Missing: SUPABASE_URL or could not extract project reference')
  }
  if (!dbPassword && !databaseUrl) {
    console.error('   Missing: DB_PASSWORD (required for PostgreSQL connection)')
    console.error('   Or provide: DATABASE_URL (full connection string)')
  }
  console.error('')
  console.error('   Option 1: Add DB_PASSWORD to .env')
  console.error('   Option 2: Add DATABASE_URL with full connection string to .env')
  console.error('   Example: DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres')
}

const poolConfig: any = {
  connectionString: connectionString,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000 // Increased timeout for Supabase
}

// Add SSL config for Supabase connections
if (projectRef) {
  poolConfig.ssl = {
    rejectUnauthorized: false // Required for Supabase connections
  }
}

const pool = new Pool(poolConfig)

// Test connection on startup
let connectionStatus: 'checking' | 'connected' | 'failed' = 'checking'

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version')
    connectionStatus = 'connected'
    console.log('✅ Database: Connection established successfully!')
    console.log(`   Type: ${connectionType}`)
    console.log(`   PostgreSQL Version: ${result.rows[0]?.pg_version?.split(' ')[0] || 'unknown'}`)
    return true
  } catch (error: any) {
    connectionStatus = 'failed'
    console.error('❌ Database: Connection failed!')
    console.error(`   Error: ${error.message || error}`)
    if (error.code === 'ENOTFOUND') {
      console.error('   Hostname not found. Check:')
      console.error('   1. Is DB_PASSWORD set in .env? (required for direct connection)')
      console.error('   2. Is the Supabase project active?')
      console.error('   3. Try using connection pooler instead of direct connection')
    } else if (error.code === '28P01') {
      console.error('   Authentication failed. Check DB_PASSWORD in .env')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Check hostname and port')
    }
    return false
  }
}

// Test connection immediately (non-blocking)
setTimeout(() => {
  testConnection().catch(() => {
    // Error already logged
  })
}, 1000) // Wait 1 second for pool to initialize

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[] }> {
  const client = await pool.connect()
  try {
    const result = await client.query<T>(text, params)
    return { rows: result.rows }
  } finally {
    client.release()
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1')
    if (connectionStatus !== 'connected') {
      connectionStatus = 'connected'
      console.log('✅ Database: Connection verified')
    }
    return true
  } catch (error: any) {
    if (connectionStatus !== 'failed') {
      connectionStatus = 'failed'
      console.error('❌ Database: Connection check failed:', error.message || error)
    }
    return false
  }
}

export function getConnectionStatus(): 'checking' | 'connected' | 'failed' {
  return connectionStatus
}
