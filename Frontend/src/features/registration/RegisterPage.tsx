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
    busStop: '',
    category: 'delegate', // 'delegate' | 'member' | 'invitation'
    idMode: 'auto', // 'auto' | 'manual'
    manualId: '',
    committee: ''
  })

  const handleSingleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload: any = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        email: formData.email,
        category: formData.category,
        manualId: formData.idMode === 'manual' ? formData.manualId : undefined
      }

      if (formData.category === 'delegate') {
        payload.council = formData.council
        payload.position = formData.council
      } else if (formData.category === 'member') {
        payload.committee = formData.committee
        payload.position = formData.position
      } else if (formData.category === 'invitation') {
        payload.committee = formData.committee
        payload.position = formData.position
      }

      const result = await api.registerParticipant(payload)

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
        busStop: '',
        category: 'delegate',
        idMode: 'auto',
        manualId: '',
        committee: ''
      })
    } catch (err: any) {
      setError(err.message || 'Failed to register participant')
    } finally {
      setLoading(false)
    }
  }

  const memberCommittees = [
    'Executive',
    'Registration Affairs',
    'Socials & Events',
    'Public Relations',
    'Media & Design',
    'Operations & Logistics',
    'High Board'
  ]

  const delegateCouncils = [
    'ICJ',
    'DISEC',
    'PRESS',
    'HRC'
  ]

  const invitationTypes = [
    'Executive Invitation',
    'General Invitation',
    'Alumni Invitation'
  ]

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
                    Phone Number {formData.category !== 'invitation' && '*'}
                  </label>
                  <input
                    type="tel"
                    required={formData.category !== 'invitation'}
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      category: e.target.value,
                      council: '',
                      committee: '',
                      position: ''
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="delegate">Delegate</option>
                    <option value="member">Member</option>
                    <option value="invitation">Invitation</option>
                  </select>
                </div>

                {formData.category === 'delegate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Council *
                    </label>
                    <select
                      required
                      value={formData.council}
                      onChange={(e) => setFormData({ ...formData, council: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Council...</option>
                      {delegateCouncils.map(council => (
                        <option key={council} value={council}>{council}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.category === 'member' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Committee *
                      </label>
                      <select
                        required
                        value={formData.committee}
                        onChange={(e) => setFormData({ ...formData, committee: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Committee...</option>
                        {memberCommittees.map(committee => (
                          <option key={committee} value={committee}>{committee}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role / Position *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        placeholder="e.g. Member, Head, Chair"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {formData.category === 'invitation' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invitation Type *
                      </label>
                      <select
                        required
                        value={formData.committee}
                        onChange={(e) => setFormData({ ...formData, committee: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Sub-category...</option>
                        {invitationTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role / Position
                      </label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        placeholder="e.g. VIP (defaults to 'Invitation')"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Assignment Mode *
                  </label>
                  <select
                    required
                    value={formData.idMode}
                    onChange={(e) => setFormData({ ...formData, idMode: e.target.value, manualId: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Automatic (System Generated)</option>
                    <option value="manual">Manual Assignment</option>
                  </select>
                </div>

                {formData.idMode === 'manual' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Participant ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.manualId}
                      onChange={(e) => setFormData({ ...formData, manualId: e.target.value.trim() })}
                      placeholder="e.g. EX-INV-01, EX-10, PRS-02"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
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
