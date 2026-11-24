export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `http://${window.location.hostname}:3001`
    : 'http://localhost:3001'
)

/** Error with the HTTP status and body, or network=true when the server could not be reached. */
export class ApiError extends Error {
  status?: number
  data?: any
  network?: boolean
  constructor(message: string, opts: { status?: number; data?: any; network?: boolean } = {}) {
    super(message)
    Object.assign(this, opts)
  }
}

async function callApi(endpoint: string, options?: RequestInit, timeoutMs?: number) {
  // Optional time limit: a request stuck on bad venue Wi-Fi counts as offline
  const controller = timeoutMs ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const url = `${API_BASE_URL}${endpoint}`

    const token = localStorage.getItem('auth_token')
    const response = await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {}),
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })

    // Session expired or revoked on the server: sign out and go to login
    if (response.status === 401 && !endpoint.startsWith('/api/auth/login')) {
      tokenManager.clearToken()
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.assign('/auth/login')
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))
      throw new ApiError(errorData.error || `HTTP ${response.status}: ${response.statusText}`, { status: response.status, data: errorData })
    }
    return response.json()
  } catch (error) {
    if (error instanceof ApiError) throw error
    // fetch() itself failed: offline or server unreachable
    throw new ApiError('No connection to the server', { network: true })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const api = {
  // Participants
  getParticipants: () => callApi('/api/participants'),
  getParticipant: (id: string, includeTracking = false) =>
    callApi(`/api/participants/${id}${includeTracking ? '?include=tracking' : ''}`),
  getParticipantTracking: (id: string) =>
    callApi(`/api/participants/${id}/tracking`),
  getParticipantHistory: (id: string) =>
    callApi(`/api/participants/${id}/history`),
  updateParticipant: (id: string, data: any) =>
    callApi(`/api/participants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  deleteParticipant: (id: string) =>
    callApi(`/api/participants/${id}`, { method: 'DELETE' }),
  deleteAllParticipants: () =>
    callApi('/api/participants', { method: 'DELETE' }),

  // Registration
  registerParticipant: (data: any) =>
    callApi('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  // Import
  importCSV: (csvData: string) =>
    callApi('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData })
    }),

  // Tracking
  updateAttendance: (data: any, timeoutMs?: number) =>
    callApi('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, timeoutMs),

  updateBus: (data: any) =>
    callApi('/api/bus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  updateFood: (data: any, timeoutMs?: number) =>
    callApi('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, timeoutMs),

  updateGame: (data: any) =>
    callApi('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  updateComments: (data: any) =>
    callApi('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  getCurrentPlayers: (day?: string) =>
    callApi(`/api/games/current-players${day ? `?day=${day}` : ''}`),

  // Bus tracking commented out - not used for this event
  // updateBus: (data: any) => 
  //   fetch(`${API_BASE_URL}/api/bus`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(data)
  //   }).then(r => r.json()),

  // QR Codes
  generateQR: (participantId: string) =>
    callApi('/api/qr/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId })
    }),

  bulkGenerateQR: (participantIds: string[]) =>
    callApi('/api/qr/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantIds })
    }),

  // Analytics
  getAnalytics: () =>
    callApi('/api/analytics'),
  getVoucherAnalytics: () =>
    callApi('/api/analytics/vouchers'),
  exportAttendance: (filters: { day?: string; council?: string; committee?: string; dayType?: string; participantType?: string }) => {
    const params = new URLSearchParams()
    if (filters.day) params.append('day', filters.day)
    if (filters.council) params.append('council', filters.council)
    if (filters.committee) params.append('committee', filters.committee)
    if (filters.dayType) params.append('dayType', filters.dayType)
    if (filters.participantType) params.append('participantType', filters.participantType)
    return callApi(`/api/analytics/attendance/export?${params.toString()}`)
  },

  // Scan analytics (Press Head / Secretariats see only their own council)
  getScanAnalytics: (params: { council?: string; session?: string } = {}) => {
    const q = new URLSearchParams()
    if (params.council) q.append('council', params.council)
    if (params.session) q.append('session', params.session)
    const qs = q.toString()
    return callApi(`/api/scan-analytics${qs ? `?${qs}` : ''}`)
  },

  // Admin
  getScanVersion: (council?: string) =>
    callApi(`/api/scan-analytics/version${council ? `?council=${encodeURIComponent(council)}` : ''}`),
  getScanLog: (params: { council?: string; limit?: number } = {}) => {
    const q = new URLSearchParams()
    if (params.council) q.set('council', params.council)
    if (params.limit) q.set('limit', String(params.limit))
    return callApi(`/api/scan-analytics/log${q.toString() ? `?${q}` : ''}`)
  },
  searchScanPeople: (q: string, council?: string) => {
    const p = new URLSearchParams({ q })
    if (council) p.set('council', council)
    return callApi(`/api/scan-analytics/search?${p}`)
  },
  getScanPerson: (id: string) => callApi(`/api/scan-analytics/person/${encodeURIComponent(id)}`),
  /** Admins and Secretariats: mark someone present / checked out without their QR, or undo it. */
  manualCheckIn: (body: { id: string; session: string; action: 'checkin' | 'checkout' | 'undo-checkin' | 'undo-checkout' }) =>
    callApi('/api/scan-analytics/manual', { method: 'POST', body: JSON.stringify(body) }),
  getScanExport: (council?: string) =>
    callApi(`/api/scan-analytics/export${council ? `?council=${encodeURIComponent(council)}` : ''}`),
  sendQrEmail: (body: { participantId?: string; all?: boolean; testTo?: string }) =>
    callApi('/api/qr-email', { method: 'POST', body: JSON.stringify(body) }),
  getQrEmailStatus: () => callApi('/api/qr-email/status'),
  clearTrackingData: (dataType: string) =>
    callApi('/api/admin/clear-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataType })
    }),

  // Auth
  login: (email: string, password: string) =>
    callApi('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password }) // Backend expects 'username' but we pass email
    }),

  logout: () =>
    callApi('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }),

  verifyToken: () =>
    callApi('/api/auth/verify'),

  // Health
  health: () =>
    callApi('/health')
}

// Token management utilities
export const tokenManager = {
  setToken: (token: string, expiresAt: string, role?: string, user?: any) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_token_expires', expiresAt)
    if (role) localStorage.setItem('auth_role', role)
    if (user) localStorage.setItem('auth_user', JSON.stringify(user))
  },

  getToken: (): string | null => {
    return localStorage.getItem('auth_token')
  },

  getUserRole: (): string | null => {
    // Try to get role from auth_role first, then from user object
    const role = localStorage.getItem('auth_role')
    if (role) return role

    const userStr = localStorage.getItem('auth_user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        return user?.role || null
      } catch {
        return null
      }
    }
    return null
  },

  getUser: (): any => {
    const userStr = localStorage.getItem('auth_user')
    return userStr ? JSON.parse(userStr) : null
  },

  isTokenValid: (): boolean => {
    const token = localStorage.getItem('auth_token')
    const expiresAt = localStorage.getItem('auth_token_expires')

    if (!token || !expiresAt) {
      return false
    }

    const expirationDate = new Date(expiresAt)
    const now = new Date()

    return expirationDate > now
  },

  clearToken: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_token_expires')
    localStorage.removeItem('auth_role')
    localStorage.removeItem('auth_user')
  }
}
