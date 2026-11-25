import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../../lib/api'
import { fmtWhen, pct } from '../../lib/days'
import { PageHeader, StatGrid, StatTile } from '../../components/ui'
import { Users, Search, Edit, Trash2, QrCode, Eye, Plus, RefreshCw, X, Download, Calendar, UtensilsCrossed, Gamepad2, Ticket, Mail, Send } from 'lucide-react'

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

  // QR email (Resend). Real sends stay off on the server until QR_EMAIL_ENABLED=true.
  const [emailStatus, setEmailStatus] = useState<{ configured: boolean; enabled: boolean; from: string; excluded?: string[] } | null>(null)
  const [testTo, setTestTo] = useState('')
  const [emailBusy, setEmailBusy] = useState<string | null>(null)
  const [emailNote, setEmailNote] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    loadParticipants()
    api.getQrEmailStatus().then(setEmailStatus).catch(() => setEmailStatus(null))
  }, [])

  const sendTestEmail = async () => {
    setEmailBusy('test'); setEmailNote(null)
    try {
      await api.sendQrEmail({ testTo: testTo.trim() })
      setEmailNote({ tone: 'ok', text: `Test email sent to ${testTo.trim()}. Check the inbox (and spam).` })
    } catch (err: any) {
      setEmailNote({ tone: 'err', text: err.message || 'Test email failed' })
    } finally { setEmailBusy(null) }
  }

  const emailOne = async (p: Participant) => {
    if (!p.email) { setEmailNote({ tone: 'err', text: `${p.id} has no email address.` }); return }
    if (!confirm(`Email ${p.id}'s QR code to ${p.email}?`)) return
    setEmailBusy(p.id); setEmailNote(null)
    try {
      const r = await api.sendQrEmail({ participantId: p.id })
      if (r?.sent > 0) setEmailNote({ tone: 'ok', text: `QR code emailed to ${p.name} (${p.id}).` })
      else setEmailNote({ tone: 'err', text: `${p.id} was not emailed: ${r?.failed?.[0]?.error || 'no valid email address on file'}` })
    } catch (err: any) {
      setEmailNote({ tone: 'err', text: `${p.id}: ${err.message || 'failed'}` })
    } finally { setEmailBusy(null) }
  }

  const emailAll = async () => {
    const skip = new Set(emailStatus?.excluded ?? ['UNI-03'])
    const withEmail = participants.filter((p) => (p.role ?? '').startsWith('OC Member (') && !skip.has(p.id) && p.email && p.email.includes('@'))
    if (!confirm(`Email QR codes to all ${withEmail.length} OC members with an email address (skipping ${[...skip].join(', ')})? This sends real emails.`)) return
    setEmailBusy('all'); setEmailNote(null)
    let sent = 0
    const failed: string[] = []
    setBulkProgress({ done: 0, total: withEmail.length })
    // One request per person keeps each call short and shows progress
    for (let i = 0; i < withEmail.length; i += 2) {
      await Promise.all(withEmail.slice(i, i + 2).map(async (p) => {
        try {
          const r = await api.sendQrEmail({ participantId: p.id })
          if (r?.sent > 0) sent++; else failed.push(p.id)
        } catch { failed.push(p.id) }
      }))
      setBulkProgress({ done: Math.min(i + 2, withEmail.length), total: withEmail.length })
      await new Promise((r) => setTimeout(r, 1100))
    }
    setBulkProgress(null); setEmailBusy(null)
    setEmailNote({ tone: failed.length ? 'err' : 'ok', text: `Sent ${sent}.${failed.length ? ` Failed: ${failed.join(', ')}` : ''}` })
  }

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
        staff: typedData.filter((p: Participant) => p.type === 'staff').length,
        delegates: typedData.filter((p: Participant) => p.type === 'delegate').length,
        members: typedData.filter((p: Participant) => p.type === 'member').length,
        invitations: typedData.filter((p: Participant) => p.type === 'invitation').length
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

  const councilCounts = Object.entries(participants.reduce<Record<string, number>>((acc, p) => {
    const c = p.council || p.role?.match(/^OC Member \((.*)\)$/)?.[1]
    if (c) acc[c] = (acc[c] ?? 0) + 1
    return acc
  }, {})).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 4)

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
                              <td className="px-3 py-2">{fmtWhen(a.session_date || a.check_in_time)}</td>
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
                              <td className="px-3 py-2">{fmtWhen(f.claimed_at)}</td>
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
                    const baseKey = `${item.type || item.activity_type}_${item.activity || item.title}`
                    const key = (item.type === 'bus' || item.activity_type === 'bus')
                      ? `${baseKey}_${item.details || item.description}`
                      : baseKey
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
                                {fmtWhen(item.timestamp || item.created_at)}
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
    <div className="jn-page">
      <div className="jn-shell">
        <div className="max-w-7xl mx-auto w-full overflow-x-hidden">
          <PageHeader
            title="Participants"
            meta="OC Conference '27 members: list, QR codes and edits"
            actions={
              <button onClick={loadParticipants} className="btn-primary flex items-center gap-2 px-4 py-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            }
          />

          <StatGrid cols={5}>
            <StatTile label="OC members" icon={<Users />} tone="ink" value={participants.length} sub={`${participants.filter((p) => p.email && p.email.trim()).length} have an email`} />
            {councilCounts.map(([name, n]) => (
              <StatTile key={name} label={name} tone="blue" value={n} sub={`${pct(n, participants.length)}% of members`} onClick={() => setSearchTerm(searchTerm === name ? '' : name)} active={searchTerm === name} />
            ))}
          </StatGrid>

          {/* QR email */}
          <div className="jn-card p-4 sm:p-5 mb-6" style={{ '--card-color': 'var(--jn-blue)' } as CSSProperties}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-3 lg:w-64 shrink-0">
                <div className="jn-icon-tile"><Mail className="w-6 h-6" /></div>
                <div>
                  <p className="font-black">Email QR codes</p>
                  <p className="text-xs text-gray-600">
                    {!emailStatus ? 'Checking email setup...' : !emailStatus.configured ? 'Not set up yet (needs a Resend key)' : emailStatus.enabled ? 'Ready to send' : 'Test emails only for now'}
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="Your email for a test"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={sendTestEmail}
                  disabled={!emailStatus?.configured || !testTo.includes('@') || emailBusy !== null}
                  className="btn-secondary flex items-center justify-center gap-2 text-sm px-4 py-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />{emailBusy === 'test' ? 'Sending...' : 'Send test'}
                </button>
                <button
                  onClick={emailAll}
                  disabled={!emailStatus?.enabled || emailBusy !== null}
                  title={emailStatus?.enabled ? '' : 'Switched on after the test email is approved'}
                  className="jn-sticker-button flex items-center justify-center gap-2 text-sm px-4 py-2 disabled:opacity-50"
                  style={{ '--button-color': 'var(--jn-blue)' } as CSSProperties}
                >
                  <Mail className="w-4 h-4" />
                  {bulkProgress ? `Sending ${bulkProgress.done}/${bulkProgress.total}` : 'Email all'}
                </button>
              </div>
            </div>
            {bulkProgress && (
              <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-[var(--jn-blue)] transition-all duration-500" style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
              </div>
            )}
            {emailNote && (
              <p className={`mt-3 text-sm font-semibold ${emailNote.tone === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{emailNote.text}</p>
            )}
          </div>

          {/* Filters */}
          <div className="jn-card p-4 mb-8" style={{ '--card-color': 'var(--jn-purple)' } as CSSProperties}>
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
            </div>
          </div>

          {/* Participants List */}
          <div className="overflow-x-auto oc-panel oc-table-panel">
            <table className="w-full divide-y divide-gray-200 text-sm min-w-[900px] sm:min-w-0">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider min-w-[140px]">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider min-w-[120px]">Council/Committee</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider min-w-[160px]">Position</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider min-w-[180px]">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider min-w-[120px]">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'No participants found matching your search' : 'No participants found'}
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {participant.id}
                      </td>
                      <td className="px-4 py-4 text-gray-900 whitespace-normal break-words">
                        {participant.name}
                      </td>
                      <td className="px-4 py-4 text-gray-700 whitespace-normal break-words">
                        {participant.council || participant.committee || 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-gray-700 whitespace-normal break-words">
                        {participant.role || 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-gray-700 break-all">
                        {participant.email && participant.email.trim() !== '' ? participant.email : 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-gray-700 whitespace-nowrap">
                        {participant.phoneNumber && participant.phoneNumber.trim() !== '' ? participant.phoneNumber : 'N/A'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`oc-badge ${participant.type === 'delegate' ? 'oc-tone-out' : participant.type === 'staff' ? 'oc-tone-bad' : participant.type === 'invitation' ? 'oc-tone-good' : 'oc-tone-blue'}`}>
                          {participant.type === 'delegate' ? 'Delegate' :
                            participant.type === 'staff' ? 'Staff' :
                              participant.type === 'invitation' ? 'Invitation' : 'Member'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewHistory(participant)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleGenerateQR(participant.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Generate QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {emailStatus?.enabled && !(emailStatus.excluded ?? ['UNI-03']).includes(participant.id) && (
                            <button
                              onClick={() => emailOne(participant)}
                              disabled={emailBusy !== null}
                              className="p-2 text-[var(--jn-blue)] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Email QR code"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(participant)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(participant.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-sm text-gray-600 text-center">
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
