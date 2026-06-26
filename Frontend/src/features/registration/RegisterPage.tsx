import { useState } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../../lib/api'
import { UserPlus, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Registration form
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    position: '',
    gender: 'Male',
    email: '',
    council: '',
    busRoute: '',
    busStop: ''
  })

  const handleSingleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await api.registerParticipant({
        ...formData,
        position: formData.council || formData.position
      })

      setSuccess(`Participant ${result.participant?.id} registered successfully!`)
      // Reset form
      setFormData({
        name: '',
        phoneNumber: '',
        position: '',
        gender: 'Male',
        email: '',
        council: '',
        busRoute: '',
        busStop: ''
      })
    } catch (err: any) {
      setError(err.message || 'Failed to register participant')
    } finally {
      setLoading(false)
    }
  }


  const memberCommittees = [
    'Executive',
    'Operations',
    'Registration Affairs',
    'Public Relations',
    'Media & Design',
    'Socials'
  ]

  const delegateCouncils = [
    'ICJ',
    'UNOOSA',
    'DISEC',
    'PRESS',
    'UNHRC',
    'UN Women',
    'UNODC'
  ]

  const isDelegate = delegateCouncils.includes(formData.council || formData.position)

  return (
    <div className="jn-page">
      <div className="jn-shell">
        <div className="max-w-4xl mx-auto w-full overflow-x-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">Register Participant</h1>
              <p className="text-gray-600 text-sm sm:text-base">Register a new participant to the system</p>
            </div>
          </div>

          <div className="jn-card p-4 sm:p-6 mb-4 sm:mb-6" style={{ '--card-color': 'var(--jn-blue)' } as CSSProperties}>
            <img src="/sticker-handshake.png" alt="" aria-hidden="true" className="hidden sm:block jn-sticker -right-6 -top-6 rotate-12" />
            <form onSubmit={handleSingleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isDelegate ? 'Council *' : 'Committee/Position *'}
                  </label>
                  <select
                    required
                    value={formData.council || formData.position}
                    onChange={(e) => {
                      if (delegateCouncils.includes(e.target.value)) {
                        setFormData({ ...formData, council: e.target.value, position: '' })
                      } else {
                        setFormData({ ...formData, position: e.target.value, council: '' })
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <optgroup label="Member Committees">
                      {memberCommittees.map(committee => (
                        <option key={committee} value={committee}>{committee}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Delegate Councils">
                      {delegateCouncils.map(council => (
                        <option key={council} value={council}>{council}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="jn-sticker-button w-full md:w-auto px-6 py-3 flex items-center gap-2"
                style={{ '--button-color': 'var(--jn-blue)' } as CSSProperties}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Register Participant
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
