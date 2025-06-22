'use client'

import { useState } from 'react'
import { generateParticipantId } from '@/lib/idGenerator'
import { generateQRCodeUrl } from '@/lib/qrHelper'
import { QRCodeDisplay } from '@/components/QRCodeGenerator'
import { Participant, CommitteeType } from '@/types/participant'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    position: '' as CommitteeType | '',
    gender: 'Male' as 'Male' | 'Female'
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null)
  const [error, setError] = useState<string>('')

  const committees: CommitteeType[] = [
    'Executive',
    'Operations', 
    'Registration Affairs',
    'Public Relations',
    'Media & Design',
    'Socials',
    'ICJ Delegates',
    'UNOOSA Delegates',
    'DISEC Delegates',
    'Press Delegates',
    'UN Women Delegates',
    'UNODC Delegates'
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.phoneNumber || !formData.position) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Call the registration API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      console.log('Successfully registered participant:', result.participant)
      setRegisteredParticipant(result.participant)
      
      // Reset form
      setFormData({
        name: '',
        phoneNumber: '',
        position: '',
        gender: 'Male'
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register participant')
    } finally {
      setIsSubmitting(false)
    }
  }

  const registerAnother = () => {
    setRegisteredParticipant(null)
    setError('')
  }

  if (registeredParticipant) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registration Successful!
          </h1>
          <p className="text-gray-600">
            Participant has been registered and QR code generated.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Participant Details */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Participant Details</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="text-lg font-mono font-bold text-blue-600">{registeredParticipant.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-lg">{registeredParticipant.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <p className="text-lg">{registeredParticipant.position}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <p className="text-lg">{registeredParticipant.gender}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <p className="text-lg">{registeredParticipant.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">QR Code</h2>
            <QRCodeDisplay 
              qrData={registeredParticipant.qrUrl || ''}
              participantId={registeredParticipant.id}
              size={250}
            />
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={registerAnother}
            className="btn-primary"
          >
            Register Another Participant
          </button>
          <a
            href="/admin/dashboard"
            className="btn-secondary"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Register New Participant
        </h1>
        <p className="text-gray-600">
          Register a single participant and generate their ID and QR code.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter participant's full name"
                className="form-input w-full"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="01234567890"
                className="form-input w-full"
                required
              />
            </div>

            {/* Committee/Position */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                Committee/Position *
              </label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="form-select w-full"
                required
              >
                <option value="">Select a committee...</option>
                {committees.map((committee) => (
                  <option key={committee} value={committee}>
                    {committee}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="Male"
                    checked={formData.gender === 'Male'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Male
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="Female"
                    checked={formData.gender === 'Female'}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Female
                </label>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`btn-primary flex-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Registering...' : 'Register Participant'}
              </button>
              <a
                href="/admin/import"
                className="btn-secondary flex-1 text-center"
              >
                Bulk Import Instead
              </a>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What happens when you register?</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✓</span>
              Auto-generated unique ID with committee prefix
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✓</span>
              Transparent QR code creation for easy printing
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✓</span>
              Data saved to Google Sheets automatically
            </li>
            <li className="flex items-center">
              <span className="text-blue-500 mr-2">✓</span>
              Ready for attendance and activity tracking
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
} 