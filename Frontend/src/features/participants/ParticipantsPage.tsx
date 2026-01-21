import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Users, Search, Edit, Trash2, QrCode, Eye, Plus, RefreshCw, X, Download, Calendar, UtensilsCrossed, Gamepad2, Ticket } from 'lucide-react'

interface Participant {
  id: string
  name: string
  phoneNumber: string
  email?: string
  position?: string
  council?: string
  committee?: string
  role?: string
  gender: string
  qrUrl?: string
  type?: 'delegate' | 'member' | 'invitation' | 'staff'
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'delegate' | 'member' | 'invitation' | 'staff'>('all')
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    phoneNumber: '',
    position: '',
    gender: 'Male',
    email: '',
    council: '',
    committee: '',
    role: '',
    password: ''
  })
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeData, setQrCodeData] = useState<{ qrUrl: string; participantId: string; participantName: string } | null>(null)

  useEffect(() => {
    loadParticipants()
  }, [])

  const loadParticipants = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getParticipants()
      // Use backend type if available, otherwise infer from data
      const typedData = data.map((p: any) => ({
        ...p,
        type: p.type || (p.council ? 'delegate' : p.id?.startsWith('INV') ? 'invitation' : 'member'),
        email: p.email || null,
        phoneNumber: p.phoneNumber || p.phone_number || null
      }))
      console.log('Participants data loaded:', {
        total: typedData.length,
        staff: typedData.filter(p => p.type === 'staff').length,
        delegates: typedData.filter(p => p.type === 'delegate').length,
        members: typedData.filter(p => p.type === 'member').length,
        invitations: typedData.filter(p => p.type === 'invitation').length
      })
      setParticipants(typedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load participants')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete participant ${id}? This action cannot be undone.`)) {
      return
    }

    try {
      await api.deleteParticipant(id)
      await loadParticipants()
      alert('Participant deleted successfully')
    } catch (err: any) {
      alert(`Failed to delete participant: ${err.message}`)
    }
  }

  const handleGenerateQR = async (id: string) => {
    try {
      const participant = participants.find(p => p.id === id)
      const result = await api.generateQR(id)
      if (result.qrUrl) {
        setQrCodeData({
          qrUrl: result.qrUrl,
          participantId: id,
          participantName: participant?.name || id
        })
        setShowQRModal(true)
        await loadParticipants()
      }
    } catch (err: any) {
      alert(`Failed to generate QR code: ${err.message}`)
    }
  }

  const handleDownloadQR = () => {
    if (!qrCodeData) return

    // Create a temporary anchor element to download the image
    const link = document.createElement('a')
    link.href = qrCodeData.qrUrl
    link.download = `QR_${qrCodeData.participantId}_${qrCodeData.participantName.replace(/\s+/g, '_')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewHistory = async (participant: Participant) => {
    try {
      setLoading(true)
      const data = await api.getParticipantHistory(participant.id)
      setHistory(data)
      setSelectedParticipant(participant)
      setShowHistory(true)
    } catch (err: any) {
      alert(`Failed to load history: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant)
    setEditForm({
      name: participant.name,
      phoneNumber: participant.phoneNumber || '',
      position: participant.role || participant.council || participant.committee || '',
      gender: participant.gender || 'Male',
      email: participant.email || '',
      council: participant.council || '',
      committee: participant.committee || '',
      role: participant.role || '',
      password: ''
    })
    setShowEditModal(true)
  }

  const handleUpdate = async () => {
    if (!editingParticipant) return

    try {
      setLoading(true)
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber
      }

      // Only include password if it was changed
      if (editForm.password && editForm.password.trim()) {
        updateData.password = editForm.password
      }

      if (editingParticipant.type === 'delegate') {
        if (editForm.council) updateData.council = editForm.council
      } else {
        if (editForm.committee) updateData.committee = editForm.committee
        if (editForm.role) updateData.role = editForm.role
      }

      await api.updateParticipant(editingParticipant.id, updateData)
      setShowEditModal(false)
      await loadParticipants()
      alert('Participant updated successfully')
    } catch (err: any) {
      alert(`Failed to update participant: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const filteredParticipants = participants.filter(p => {
    const searchFields = [
      p.name.toLowerCase(),
      p.id.toLowerCase(),
      p.council?.toLowerCase() || '',
      p.committee?.toLowerCase() || '',
      p.role?.toLowerCase() || '',
      p.email?.toLowerCase() || '',
      p.phoneNumber?.toLowerCase() || '',
      p.type?.toLowerCase() || ''
    ].join(' ')
    const matchesSearch = searchFields.includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || p.type === filterType
    return matchesSearch && matchesFilter
  })

  if (loading && participants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--color-primary-blue)]" />
          <p className="text-gray-600">Loading participants...</p>
        </div>
      </div>
    )
  }

  if (showHistory && selectedParticipant) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">History: {selectedParticipant.name}</h1>
                <p className="text-gray-600 text-sm sm:text-base">ID: {selectedParticipant.id}</p>
              </div>
              <button
                onClick={() => {
                  setShowHistory(false)
                  setSelectedParticipant(null)
                  setHistory(null)
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>

            {history && (
              <div className="space-y-4">
                {history.attendance && history.attendance.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Attendance
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Session</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.attendance.map((a: any, idx: number) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2">{a.session_name || a.session_type}</td>
                              <td className="px-3 py-2">{new Date(a.session_date || a.check_in_time).toLocaleString()}</td>
                              <td className="px-3 py-2">
                                <span className="text-green-600">Present</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {history.food && history.food.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5" />
                      Food History
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Meal</th>
                            <th className="px-3 py-2 text-left">Day</th>
                            <th className="px-3 py-2 text-left">Claimed At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.food.map((f: any, idx: number) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2">{f.meal_type}</td>
                              <td className="px-3 py-2">{f.meal_day}</td>
                              <td className="px-3 py-2">{new Date(f.claimed_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {history.vouchers && history.vouchers.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Ticket className="w-5 h-5" />
                      Voucher Claim History
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Voucher Name</th>
                            <th className="px-3 py-2 text-left">Vendor</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Claimed At</th>
                            <th className="px-3 py-2 text-left">Redeemed At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.vouchers.map((v: any, idx: number) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2">{v.voucher_name}</td>
                              <td className="px-3 py-2">{v.vendor_name || 'N/A'}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.status === 'redeemed'
                                  ? 'bg-green-100 text-green-700'
                                  : v.status === 'active'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                  }`}>
                                  {v.status || 'active'}
                                </span>
                              </td>
                              <td className="px-3 py-2">{new Date(v.claimed_at).toLocaleString()}</td>
                              <td className="px-3 py-2">{v.redeemed_at ? new Date(v.redeemed_at).toLocaleString() : 'Not redeemed'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {history.timeline && history.timeline.length > 0 && (() => {
                  // Deduplicate timeline entries - group by activity type and title, keep only latest
                  const seen = new Map<string, any>()
                  const deduplicated = history.timeline.filter((item: any) => {
                    const key = `${item.type || item.activity_type}_${item.activity || item.title}`
                    const timestamp = new Date(item.timestamp || item.created_at).getTime()
                    const existing = seen.get(key)

                    if (!existing || timestamp > new Date(existing.timestamp || existing.created_at).getTime()) {
                      seen.set(key, item)
                      return true
                    }
                    return false
                  })

                  return (
                    <div>
                      <h2 className="text-xl font-bold mb-4">Activity Timeline</h2>
                      <div className="space-y-3">
                        {deduplicated.map((item: any, idx: number) => {
                          // Parse metadata to get better display
                          let metadata: any = {}
                          try {
                            metadata = typeof item.metadata === 'string'
                              ? JSON.parse(item.metadata)
                              : item.metadata || {}
                          } catch (e) {
                            // Ignore parse errors
                          }

                          // Format description better
                          let displayDescription = item.details || item.description || ''
                          if (item.type === 'attendance' || item.activity_type === 'attendance') {
                            const isPresent = displayDescription.includes('present') ||
                              displayDescription.includes('true') ||
                              (metadata.value === true)
                            displayDescription = isPresent ? 'Present' : 'Absent'
                          }

                          // Format title better - replace dots with spaces and capitalize
                          let displayTitle = item.activity || item.title || ''
                          displayTitle = displayTitle.replace(/\./g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

                          return (
                            <div key={idx} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                              <p className="font-semibold text-base">{displayTitle}</p>
                              <p className={`text-sm mt-1 font-medium ${item.type === 'attendance' || item.activity_type === 'attendance'
                                ? (displayDescription === 'Present' ? 'text-green-600' : 'text-gray-600')
                                : 'text-gray-600'
                                }`}>
                                {displayDescription}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(item.timestamp || item.created_at).toLocaleString()}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {(!history.attendance || history.attendance.length === 0) &&
                  (!history.food || history.food.length === 0) &&
                  (!history.vouchers || history.vouchers.length === 0) &&
                  (!history.timeline || history.timeline.length === 0) && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No history available for this participant</p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full overflow-x-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Participants Management</h1>
              <p className="text-gray-600 text-sm sm:text-base">Manage all delegates and members</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <a
                href="/admin/register"
                className="btn-primary flex items-center gap-2 text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3 flex-1 sm:flex-none justify-center"
              >
                <Plus className="w-4 h-4" />
                Add Participant
              </a>
              <button
                onClick={loadParticipants}
                className="btn-secondary flex items-center gap-2 text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, or position..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${filterType === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('delegate')}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${filterType === 'delegate' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  Delegates
                </button>
                <button
                  onClick={() => setFilterType('member')}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${filterType === 'member' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  Members
                </button>
                <button
                  onClick={() => setFilterType('staff')}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${filterType === 'staff' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  Staff
                </button>
                <button
                  onClick={() => setFilterType('invitation')}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${filterType === 'invitation' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  Invitations
                </button>
              </div>
            </div>
          </div>

          {/* Participants List */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full divide-y divide-gray-200 text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase">Council/Committee</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      {searchTerm ? 'No participants found matching your search' : 'No participants found'}
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-2 py-3 font-medium text-xs">
                        {participant.id}
                      </td>
                      <td className="px-2 py-3 text-xs max-w-[120px] truncate">
                        {participant.name}
                      </td>
                      <td className="px-2 py-3 text-xs max-w-[100px] truncate">
                        {participant.council || participant.committee || 'N/A'}
                      </td>
                      <td className="px-2 py-3 text-xs whitespace-normal break-words min-w-[150px]">
                        {participant.role || 'N/A'}
                      </td>
                      <td className="px-2 py-3 text-xs break-all">
                        {participant.email && participant.email.trim() !== '' ? participant.email : 'N/A'}
                      </td>
                      <td className="px-2 py-3 text-xs whitespace-nowrap">
                        {participant.phoneNumber && participant.phoneNumber.trim() !== '' ? participant.phoneNumber : 'N/A'}
                      </td>
                      <td className="px-2 py-3">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${participant.type === 'delegate' ? 'bg-purple-100 text-purple-700' :
                            participant.type === 'staff' ? 'bg-red-100 text-red-700' :
                              participant.type === 'invitation' ? 'bg-green-100 text-green-700' :
                                'bg-blue-100 text-blue-700'
                          }`}>
                          {participant.type === 'delegate' ? 'D' :
                            participant.type === 'staff' ? 'S' :
                              participant.type === 'invitation' ? 'I' : 'M'}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewHistory(participant)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleGenerateQR(participant.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Generate QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(participant)}
                            className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(participant.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredParticipants.length} of {participants.length} participants
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Edit Participant</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="edit-email"
                    autoComplete="off"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {editingParticipant.type === 'delegate' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Council *
                    </label>
                    <select
                      value={editForm.council}
                      onChange={(e) => setEditForm({ ...editForm, council: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Council</option>
                      <option value="HRC">HRC</option>
                      <option value="ICJ">ICJ</option>
                      <option value="DISEC">DISEC</option>
                      <option value="PRESS">PRESS</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Committee *
                      </label>
                      <select
                        value={editForm.committee}
                        onChange={(e) => setEditForm({ ...editForm, committee: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Committee</option>
                        <option value="Executive">Executive</option>
                        <option value="Registration Affairs">Registration Affairs</option>
                        <option value="Socials & Events">Socials & Events</option>
                        <option value="Public Relations">Public Relations</option>
                        <option value="Media & Design">Media & Design</option>
                        <option value="Operations & Logistics">Operations & Logistics</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role / Position
                      </label>
                      <input
                        type="text"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        placeholder="e.g., Head of Registration Affairs"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading || !editForm.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrCodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">QR Code Generated</h2>
                <button
                  onClick={() => {
                    setShowQRModal(false)
                    setQrCodeData(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">{qrCodeData.participantName}</span>
                </p>
                <p className="text-xs text-gray-500 mb-4">ID: {qrCodeData.participantId}</p>
                <div className="flex justify-center bg-white p-4 rounded-lg border-2 border-gray-200">
                  <img
                    src={qrCodeData.qrUrl}
                    alt={`QR Code for ${qrCodeData.participantName}`}
                    className="max-w-full h-auto"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowQRModal(false)
                    setQrCodeData(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
