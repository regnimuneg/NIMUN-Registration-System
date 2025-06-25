'use client'

import { useState, useEffect } from 'react'
import { Search, CheckCircle, Users, Download, Trash2, Eye, X, AlertTriangle, Lightbulb } from 'lucide-react'
import { QRCodeDisplay, downloadAllQRCodes } from '@/components/QRCodeGenerator'
import ParticipantHistory from '@/components/ParticipantHistory'
import { Participant } from '@/types/participant'

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCommittee, setFilterCommittee] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [sortField, setSortField] = useState<'name' | 'id' | 'position' | 'gender' | 'phoneNumber'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null) // participantId being deleted
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Participant | null>(null)
  const [showHistory, setShowHistory] = useState<Participant | null>(null)
  const [success, setSuccess] = useState<string>('')
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number
    total: number
    status: string
    isDownloading: boolean
  }>({
    current: 0,
    total: 0,
    status: '',
    isDownloading: false
  })

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

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'id':
          // Extract numbers from ID for proper numeric sorting
          const aNum = parseInt(a.id.match(/\d+/)?.[0] || '0')
          const bNum = parseInt(b.id.match(/\d+/)?.[0] || '0')
          const aPrefix = a.id.replace(/\d+/, '')
          const bPrefix = b.id.replace(/\d+/, '')
          
          // First sort by prefix, then by number
          if (aPrefix !== bPrefix) {
            aValue = aPrefix
            bValue = bPrefix
          } else {
            aValue = aNum
            bValue = bNum
          }
          break
        case 'position':
          aValue = a.position.toLowerCase()
          bValue = b.position.toLowerCase()
          break
        case 'gender':
          aValue = a.gender.toLowerCase()
          bValue = b.gender.toLowerCase()
          break
        case 'phoneNumber':
          aValue = a.phoneNumber
          bValue = b.phoneNumber
          break
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortDirection === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

    setFilteredParticipants(filtered)
  }, [participants, searchTerm, filterCommittee, filterGender, sortField, sortDirection])

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
    setSortField('name')
    setSortDirection('asc')
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // If clicking a new field, set it and default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const deleteParticipant = async (participantId: string) => {
    try {
      setDeleteLoading(participantId)
      setError('')
      
      const response = await fetch(`/api/participants/${participantId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete participant')
      }
      
      // Remove from local state
      setParticipants(prev => prev.filter(p => p.id !== participantId))
      setSuccess(`Participant ${participantId} deleted successfully`)
      setShowDeleteConfirm(null)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete participant')
    } finally {
      setDeleteLoading(null)
    }
  }

  const deleteAllParticipants = async () => {
    try {
      setDeleteLoading('all')
      setError('')
      
      const response = await fetch('/api/participants', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete all participants')
      }
      
      // Clear local state
      setParticipants([])
      setFilteredParticipants([])
      setSuccess('All participants deleted successfully')
      setShowDeleteAllConfirm(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete all participants')
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleBulkDownload = async (backgroundType: 'transparent' | 'white') => {
    setDownloadProgress({
      current: 0,
      total: filteredParticipants.length,
      status: 'Preparing download...',
      isDownloading: true
    })

    await downloadAllQRCodes(
      filteredParticipants,
      backgroundType,
      (current, total, status) => {
        setDownloadProgress({
          current,
          total,
          status,
          isDownloading: current < total
        })
      }
    )

    // Reset progress after a delay
    setTimeout(() => {
      setDownloadProgress({
        current: 0,
        total: 0,
        status: '',
        isDownloading: false
      })
    }, 3000)
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              All Participants ({filteredParticipants.length})
            </h1>
            <p className="text-gray-600">
              View and manage all registered participants. Click on any participant to see their QR code.
            </p>
          </div>
          {participants.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={deleteLoading === 'all'}
              className="btn-danger"
            >
              {deleteLoading === 'all' ? 'Deleting...' : 'Delete All Participants'}
            </button>
          )}
        </div>

        {/* Success Message */}
        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="text-green-800">
              <strong>Success:</strong> {success}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Filters, Search & Sorting</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as typeof sortField)}
              className="form-select w-full"
            >
              <option value="name">Name</option>
              <option value="id">ID</option>
              <option value="position">Committee</option>
              <option value="gender">Gender</option>
              <option value="phoneNumber">Phone</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order
            </label>
            <select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
              className="form-select w-full"
            >
              <option value="asc">↑ Ascending</option>
              <option value="desc">↓ Descending</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn-secondary w-full"
            >
              Clear All
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

      {/* Bulk QR Download Section */}
      {filteredParticipants.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Bulk QR Code Download</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 text-2xl">📦</div>
              <div>
                <h3 className="font-medium text-blue-900 mb-2">Download All QR Codes as ZIP</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Download QR codes for all {filteredParticipants.length} {filteredParticipants.length === 1 ? 'participant' : 'participants'} 
                  {searchTerm || filterCommittee || filterGender ? ' (filtered)' : ''} in a convenient ZIP file.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleBulkDownload('transparent')}
                    disabled={downloadProgress.isDownloading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search className="w-4 h-4" />
                    <span>Download Transparent QR Codes</span>
                  </button>
                  <button
                    onClick={() => handleBulkDownload('white')}
                    disabled={downloadProgress.isDownloading}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>⚪</span>
                    <span>Download White Background QR Codes</span>
                  </button>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  💡 Transparent QR codes are perfect for overlaying on designs, while white background QR codes are ideal for printing.
                </div>
              </div>
            </div>
          </div>

          {/* Download Progress */}
          {downloadProgress.isDownloading && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-900">
                      {downloadProgress.status}
                    </span>
                    <span className="text-sm text-green-700">
                      {downloadProgress.current}/{downloadProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${downloadProgress.total > 0 ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message for Download */}
          {!downloadProgress.isDownloading && downloadProgress.current > 0 && downloadProgress.current === downloadProgress.total && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="text-green-600 text-xl"><CheckCircle className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-medium text-green-900">
                    {downloadProgress.status}
                  </p>
                  <p className="text-xs text-green-700">
                    Your ZIP file should start downloading automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Participants List */}
      {filteredParticipants.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users className="w-16 h-16 mx-auto" />
          </div>
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
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setSelectedParticipant(participant)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View QR
                        </button>
                        <a
                          href={`/admin/dashboard?scan=${participant.id}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Track
                        </a>
                        <button
                          onClick={() => setShowHistory(participant)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          History
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(participant)}
                          disabled={deleteLoading === participant.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deleteLoading === participant.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
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
                  size={250}
                  useExternalAPI={true}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Participant
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong> ({showDeleteConfirm.id})? 
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteParticipant(showDeleteConfirm.id)}
                  disabled={deleteLoading === showDeleteConfirm.id}
                  className="btn-danger"
                >
                  {deleteLoading === showDeleteConfirm.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete All Participants
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete <strong>ALL {participants.length} participants</strong>? 
                This will permanently remove all participant data and cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAllParticipants}
                  disabled={deleteLoading === 'all'}
                  className="btn-danger"
                >
                  {deleteLoading === 'all' ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <ParticipantHistory
          participantId={showHistory.id}
          participantName={showHistory.name}
          isModal={true}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>
  )
}