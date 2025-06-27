'use client'

import { useState } from 'react'
import { Users, Plus, Check, AlertCircle, Loader2 } from 'lucide-react'

const EXECUTIVE_PARTICIPANTS = [
  'EX-01 → Zein Raafat',
  'EX-02 → Abdallah Emam',
  'EX-03 → Adham Abdelaal',
  'EX-04 → Hana Abdelmordy',
  'EX-05 → Mariam Kabbany',
  'EX-06 → Moaz El Shahed',
  'EX-07 → Seif Elnahas',
  'EX-08 → Hassan Elsharazly',
  'EX-09 → Omar Akl',
  'EX-10 → Rawya Nabil',
  'EX-11 → Nizar Amer',
  'EX-12 → Zeina Youssef',
  'EX-13 → Malak Ehab',
  'EX-14 → Ali Sameh',
  'EX-15 → Mostafa Salama',
  'EX-16 → Farah Ghaly',
  'EX-17 → Khadija Shash',
  'EX-18 → Farah Darwish',
  'EX-19 → Omar Nabil',
  'EX-20 → Maya Nader',
  'EX-21 → Ameena GamalEldin',
  'EX-22 → Nour Elhabbak',
  'EX-23 → Sawsan Ali',
]

interface ImportResult {
  success: boolean
  message: string
  count?: number
  participants?: Array<{
    id: string
    name: string
    position: string
  }>
  error?: string
  details?: string[]
}

export default function AddExecutivesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleAddExecutives = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/import-executives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to add Executive participants',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Add Executive Participants
        </h1>
        <p className="text-gray-600">
          Add all Executive participants with their locked IDs (EX-01 through EX-23)
        </p>
      </div>

      {/* Participants Preview */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Participants to be Added ({EXECUTIVE_PARTICIPANTS.length})
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
          {EXECUTIVE_PARTICIPANTS.map((participant, index) => (
            <div key={index} className="text-sm text-gray-700 font-mono bg-gray-50 px-3 py-2 rounded">
              {participant}
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">🔒 Important: Locked IDs</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• These IDs are permanently locked to these specific participants</li>
            <li>• EX-01 can ONLY be assigned to Zein Raafat</li>
            <li>• EX-02 can ONLY be assigned to Abdallah Emam</li>
            <li>• And so on... These assignments cannot be changed</li>
            <li>• Each participant will get a QR code with their specific ID</li>
          </ul>
        </div>
      </div>

      {/* Add Button */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <button
          onClick={handleAddExecutives}
          disabled={isLoading || (result?.success === true)}
          className={`
            w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors
            ${isLoading 
              ? 'bg-blue-100 text-blue-600 cursor-not-allowed' 
              : result?.success === true
              ? 'bg-green-100 text-green-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Adding Participants...
            </>
          ) : result?.success === true ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Participants Added Successfully
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 mr-2" />
              Add All Executive Participants
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className={`rounded-lg shadow p-6 ${
          result.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            {result.success ? (
              <Check className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            )}
            
            <div className="flex-1">
              <h3 className={`font-semibold ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? 'Success!' : 'Error'}
              </h3>
              
              <p className={`mt-1 ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>

              {result.success && result.count && (
                <p className="mt-2 text-green-600 text-sm">
                  Successfully added {result.count} participants with locked IDs.
                </p>
              )}

              {result.participants && result.participants.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-green-900 mb-2">Added Participants:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {result.participants.map((participant) => (
                      <div key={participant.id} className="text-sm text-green-700 font-mono">
                        {participant.id} → {participant.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.error && (
                <div className="mt-2 text-red-700 text-sm">
                  <strong>Error:</strong> {result.error}
                </div>
              )}

              {result.details && result.details.length > 0 && (
                <div className="mt-2">
                  <strong className="text-red-900">Details:</strong>
                  <ul className="mt-1 text-sm text-red-700">
                    {result.details.map((detail, index) => (
                      <li key={index}>• {detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {result?.success && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• All Executive participants now have locked IDs</li>
            <li>• QR codes have been generated for each participant</li>
            <li>• You can now test the QR scanner with these IDs</li>
            <li>• Update phone numbers in the participants list as needed</li>
            <li>• Generate and distribute QR codes to participants</li>
          </ul>
        </div>
      )}
    </div>
  )
} 