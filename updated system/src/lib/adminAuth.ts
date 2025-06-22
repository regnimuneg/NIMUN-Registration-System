interface AdminCredentials {
  username: string
  password: string
  role: 'super-admin' | 'admin'
  name: string
}

// Admin credentials - in production, these should be in environment variables
const ADMIN_CREDENTIALS: AdminCredentials[] = [
  {
    username: 'jnimun.admin',
    password: 'JNIMUN2025@Admin',
    role: 'super-admin',
    name: 'JNIMUN Admin'
  },
  {
    username: 'tech.admin',
    password: 'TechTeam@2025',
    role: 'admin',
    name: 'Tech Team Admin'
  },
  {
    username: 'event.admin',
    password: 'EventMgmt@2025',
    role: 'admin',
    name: 'Event Management'
  }
]

export interface AuthResult {
  success: boolean
  admin?: AdminCredentials
  error?: string
}

export function authenticateAdmin(username: string, password: string): AuthResult {
  const admin = ADMIN_CREDENTIALS.find(
    cred => cred.username === username && cred.password === password
  )

  if (admin) {
    return {
      success: true,
      admin: {
        username: admin.username,
        password: '', // Don't return password
        role: admin.role,
        name: admin.name
      }
    }
  }

  return {
    success: false,
    error: 'Invalid username or password'
  }
}

export function getAdminPermissions(role: 'super-admin' | 'admin') {
  const basePermissions = [
    'view_participants',
    'register_participants',
    'track_attendance',
    'track_food',
    'track_games',
    'track_bus',
    'view_history',
    'import_participants'
  ]

  const superAdminPermissions = [
    ...basePermissions,
    'delete_participants',
    'delete_all_participants',
    'clear_tracking_data',
    'manage_admins'
  ]

  return role === 'super-admin' ? superAdminPermissions : basePermissions
}

export function hasPermission(adminRole: 'super-admin' | 'admin', permission: string): boolean {
  const permissions = getAdminPermissions(adminRole)
  return permissions.includes(permission)
} 