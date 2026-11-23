import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, tokenManager } from '../../lib/api'
import './LoginPage.css'

/**
 * Login Page
 * Split-screen NIMUN'27 design: brand panel and sign-in card
 * Matches portal.nimuneg.org design exactly
 */
export default function LoginPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Allow minimal scrolling
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.body.style.height = '100vh'
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('') // Clear error on input
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const result = await api.login(formData.email, formData.password)
      
      if (result.success) {
        // Store token with expiration, role, and user info
        if (result.token && result.expiresAt) {
          tokenManager.setToken(
            result.token, 
            result.expiresAt, 
            result.role || result.user?.role || 'member',
            result.user
          )
        }
        
        // Redirect based on role
        const userRole = result.role || result.user?.role || 'member'
        if (userRole === 'admin') {
          navigate('/admin/dashboard')
        } else if (userRole === 'analyst') {
          navigate('/analytics/scans')
        } else if (userRole === 'member') {
          navigate('/member/scanner')
        } else {
          navigate('/member/scanner') // Default to member scanner
        }
      } else {
        setError(result.error || 'Invalid credentials')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left panel: NIMUN'27 brand */}
      <div className="login-left-panel">
        <span className="login-corner login-corner-tl" aria-hidden="true" />
        <span className="login-corner login-corner-br" aria-hidden="true" />
        <img src="/oc27/star-light.png" alt="" aria-hidden="true" className="login-star login-star-a" />
        <img src="/oc27/star-light.png" alt="" aria-hidden="true" className="login-star login-star-b" />
        <div className="login-brand-content">
          <img src="/oc27/stamp-light.png" alt="NIMUN'27 Setting the Standard" className="login-logo-image" />
          <div className="login-logo">
            NIMUN<span className="login-logo-year">&apos;27</span>
          </div>
          <p className="login-headline">Setting the standard</p>
          <div className="login-rule" aria-hidden="true" />
          <p className="login-tagline">OC Conference Portal</p>
        </div>
      </div>

      {/* Right panel: sign-in form */}
      <div className="login-right-panel">
        <div className="login-form-container">
          <div className="login-card">
            <img src="/oc27/star-blue.png" alt="" aria-hidden="true" className="login-card-star" />
            <p className="login-eyebrow">Staff portal</p>
            <h1 className="login-title">Welcome <span>back</span></h1>

            {import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true' && (
              <div className="login-error login-note">
                Local demo: admin@local.test / admin123
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-input-group">
                <label htmlFor="email" className="login-label">Account ID or email</label>
                <input
                  id="email"
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. OC-REG"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  className="login-input"
                />
              </div>

              <div className="login-input-group">
                <label htmlFor="password" className="login-label">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="login-input"
                />
              </div>

              {error && (
                <div className="login-error">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4.5a1 1 0 112 0v3a1 1 0 11-2 0v-3zm1 7.5a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-button"
              >
                {loading ? (
                  <>
                    <div className="login-spinner"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* <div className="login-divider">
              <span>or</span>
            </div> */}
{/* 
            <div className="login-claim-prompt">
              <p>First time here?</p>
              <a href="#" className="login-claim-link" onClick={(e) => { e.preventDefault(); }}>
                Claim your account with your token
              </a>
            </div> */}

            {/* <div className="login-forgot-password">
              <a href="#" className="login-forgot-link" onClick={(e) => { e.preventDefault(); }}>
                Forgot your password?
              </a>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  )
}
