'use client'

import { useState, useEffect } from 'react'
import { QRCodeDisplay } from '@/components/QRCodeGenerator'
import { Participant } from '@/types/participant'

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCommittee, setFilterCommittee] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  // Get unique committees from participants
  const committees = [...new Set(participants.map(p => p.position))].sort()

  useEffect(() => {
    fetchParticipants()
  }, [])

  useEffect(() => {
    // Apply filters
    let filtered = participants

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phoneNumber.includes(searchTerm)
      )
    }

    if (filterCommittee) {
      filtered = filtered.filter(p => p.position === filterCommittee)
    }

    if (filterGender) {
      filtered = filtered.filter(p => p.gender === filterGender)
    }

    setFilteredParticipants(filtered)
  }, [participants, searchTerm, filterCommittee, filterGender])

  const fetchParticipants = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/participants')
      if (!response.ok) {
        throw new Error('Failed to fetch participants')
      }
      const data = await response.json()
      setParticipants(data)
      setFilteredParticipants(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load participants')
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterCommittee('')
    setFilterGender('')
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading participants...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
          <button 
            onClick={fetchParticipants}
            className="mt-4 btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          All Participants ({filteredParticipants.length})
        </h1>
        <p className="text-gray-600">
          View and manage all registered participants. Click on any participant to see their QR code.
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Filters & Search</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Name, ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Committee
            </label>
            <select
              value={filterCommittee}
              onChange={(e) => setFilterCommittee(e.target.value)}
              className="form-select w-full"
            >
              <option value="">All Committees</option>
              {committees.map(committee => (
                <option key={committee} value={committee}>{committee}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="form-select w-full"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{participants.length}</div>
          <div className="text-sm text-blue-800">Total Participants</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{committees.length}</div>
          <div className="text-sm text-green-800">Committees</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {participants.filter(p => p.gender === 'Male').length}
          </div>
          <div className="text-sm text-purple-800">Male</div>
        </div>
        <div className="bg-pink-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-pink-600">
            {participants.filter(p => p.gender === 'Female').length}
          </div>
          <div className="text-sm text-pink-800">Female</div>
        </div>
      </div>

      {/* Participants List */}
      {filteredParticipants.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No participants found</h3>
          <p className="text-gray-600">
            {participants.length === 0 
              ? "No participants have been registered yet. Use the import or register features to add participants."
              : "Try adjusting your search or filter criteria."
            }
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Committee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-blue-600">
                        {participant.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {participant.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {participant.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.gender}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {participant.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedParticipant(participant)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View QR
                      </button>
                      <a
                        href={`/admin/dashboard?scan=${participant.id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Track
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                QR Code for {selectedParticipant.name}
              </h3>
              
              {selectedParticipant.qrUrl && (
                <QRCodeDisplay 
                  qrData={selectedParticipant.qrUrl}
                  participantId={selectedParticipant.id}
                  size={200}
                />
              )}
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>ID:</strong> {selectedParticipant.id}</p>
                <p><strong>Committee:</strong> {selectedParticipant.position}</p>
                <p><strong>Phone:</strong> {selectedParticipant.phoneNumber}</p>
              </div>
              
              <div className="mt-6 flex gap-2 justify-center">
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <a
                  href={`/admin/dashboard?scan=${selectedParticipant.id}`}
                  className="btn-primary"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}