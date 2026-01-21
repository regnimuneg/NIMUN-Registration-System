const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function callApi(endpoint: string, options?: RequestInit) {
  try {
    const url = `${API_BASE_URL}${endpoint}`
    console.log(`[API] ${options?.method || 'GET'} ${url}`) // Debug log

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    if (error instanceof Error) {
      // Provide more helpful error messages
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Make sure the backend server is running.`)
      }
      throw error
    }
    throw new Error(`Network error: Failed to connect to backend at ${API_BASE_URL}`)
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
  updateAttendance: (data: any) =>
    callApi('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

  updateFood: (data: any) =>
    callApi('/api/food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),

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

  // Admin
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
    callApi('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      }
    }),

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
