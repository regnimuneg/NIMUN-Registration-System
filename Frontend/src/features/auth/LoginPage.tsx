import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, tokenManager } from '../../lib/api'
import './LoginPage.css'

/**
 * Login Page
 * Modern split-screen design with image slideshow
 * Matches portal.nimuneg.org design exactly
 */
export default function LoginPage() {
  const navigate = useNavigate()

  // Image slideshow URLs (local images from public folder)
  const slideshowImages = [
    '/slideshowimages/_NU27875.jpg',
    '/slideshowimages/CCPCJ\'26.jpg',
    '/slideshowimages/Council2.png',
    '/slideshowimages/Group.jpg',
    '/slideshowimages/henry.jpg',
    '/slideshowimages/plac.jpg',
    '/slideshowimages/plac2.jpg',
    '/slideshowimages/Press\'26.jpg',
    '/slideshowimages/salama.jpg'
  ]

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
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

  // Image slideshow rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % slideshowImages.length)
    }, 2500) // Change image every 2.5 seconds

    return () => clearInterval(interval)
  }, [slideshowImages.length])

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
      {/* Left Panel - Branding & Slideshow */}
      <div className="login-left-panel">
        {/* <div className="login-slideshow">
          {slideshowImages.map((image, index) => (
            <div
              key={index}
              className={`login-slideshow-image ${index === currentImageIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url(${image})` }}
            />
          ))}
        </div> */}
        <div className="login-left-overlay"></div>
        <div className="login-brand-content">
          <div className="login-logo-container">
            <img src="/Logo_White.png" alt="NIMUN Logo" className="login-logo-image" />
            <div className="login-logo-text-container">
              <div className="login-logo">
                <span className="login-logo-text">NIMUN</span>
                <span className="login-logo-year">'26</span>
              </div>
              <p className="login-tagline">Registration System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="login-right-panel">
        <div className="login-form-container">
          <div className="login-card">
            <img src="/element_05_x1163_y67_w148_h225.png" alt="" aria-hidden="true" className="login-card-sticker login-card-sticker-star" />
            <img src="/sticker-dove.png" alt="" aria-hidden="true" className="login-card-sticker login-card-sticker-dove" />
            <h1 className="login-title">Welcome Back</h1>

            {import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true' && (
              <div className="login-error" style={{ color: '#195f8c', background: '#eaf4fa' }}>
                Local demo: admin@local.test / admin123
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-input-group">
                <label htmlFor="email" className="login-label">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                  autoComplete="email"
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
