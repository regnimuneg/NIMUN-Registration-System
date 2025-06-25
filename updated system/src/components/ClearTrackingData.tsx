'use client'

import { useState } from 'react'
import { Utensils, Gamepad2, Bus, CheckCircle } from 'lucide-react'

interface ClearTrackingDataProps {
  adminRole: 'super-admin' | 'admin'
  onClearComplete?: (dataType: string) => void
}

export default function ClearTrackingData({ adminRole, onClearComplete }: ClearTrackingDataProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDataType, setSelectedDataType] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Only super admins can clear data
  if (adminRole !== 'super-admin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-600">⚠️</span>
          <span className="text-sm text-yellow-800">
            Clear tracking data feature requires Super Admin privileges.
          </span>
        </div>
      </div>
    )
  }

  const dataTypes = [
    { value: 'attendance', label: 'Attendance Data', description: 'Clear all attendance records', icon: <CheckCircle className="w-4 h-4" /> },
    { value: 'food', label: 'Food Tracking', description: 'Clear all food consumption records', icon: <Utensils className="w-4 h-4" /> },
    { value: 'games', label: 'Games & Activities', description: 'Clear all game participation records', icon: <Gamepad2 className="w-4 h-4" /> },
    { value: 'bus', label: 'Bus Transportation', description: 'Clear all bus tracking records', icon: <Bus className="w-4 h-4" /> },
    { value: 'activity-tracking', label: 'Activity Timeline', description: 'Clear timestamped activity logs', icon: <div className="w-4 h-4 bg-gray-400 rounded-full"></div> },
    { value: 'all', label: 'ALL TRACKING DATA', description: 'Clear everything (DANGER!)', icon: <div className="w-4 h-4 bg-red-500 rounded-full"></div> },
  ]

  const handleClear = async () => {
    if (!selectedDataType) return
    
    const expectedConfirmText = `CLEAR ${selectedDataType.toUpperCase()}`
    if (confirmText !== expectedConfirmText) {
      setError(`Please type "${expectedConfirmText}" to confirm`)
      return
    }

    setIsClearing(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/clear-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminRole,
          dataType: selectedDataType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to clear tracking data')
      }

      const result = await response.json()
      setSuccess(`✅ ${result.message}`)
      setSelectedDataType('')
      setConfirmText('')
      
      if (onClearComplete) {
        onClearComplete(selectedDataType)
      }
      
      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false)
        setSuccess('')
      }, 3000)
      
    } catch (err) {
      setError(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsClearing(false)
    }
  }

  const resetForm = () => {
    setSelectedDataType('')
    setConfirmText('')
    setError('')
    setSuccess('')
  }

  const handleClose = () => {
    setIsOpen(false)
    resetForm()
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center space-x-2"
      >
        <span>🗑️</span>
        <span>Clear Tracking Data</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-red-600">
                  🗑️ Clear Tracking Data
                </h2>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                <strong>Warning:</strong> This action is irreversible. All selected data will be permanently deleted.
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Data Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Data Type to Clear:
                </label>
                <div className="space-y-2">
                  {dataTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDataType === type.value
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${type.value === 'all' ? 'border-red-300 bg-red-25' : ''}`}
                    >
                      <input
                        type="radio"
                        name="dataType"
                        value={type.value}
                        checked={selectedDataType === type.value}
                        onChange={(e) => setSelectedDataType(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {type.icon}
                          <span className={`font-medium ${type.value === 'all' ? 'text-red-600' : 'text-gray-900'}`}>
                            {type.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Confirmation Input */}
              {selectedDataType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <code className="bg-gray-100 px-2 py-1 rounded">CLEAR {selectedDataType.toUpperCase()}</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder={`Type "CLEAR ${selectedDataType.toUpperCase()}" to confirm`}
                    disabled={isClearing}
                  />
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleClose}
                disabled={isClearing}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={!selectedDataType || confirmText !== `CLEAR ${selectedDataType.toUpperCase()}` || isClearing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isClearing ? 'Clearing...' : 'Clear Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 