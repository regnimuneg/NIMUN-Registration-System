import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../../lib/api'
import { Users, Search, Eye, RefreshCw, X, Calendar, UtensilsCrossed, Ticket } from 'lucide-react'

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

export default function MemberParticipantsPage() {
    const [participants, setParticipants] = useState<Participant[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'delegate' | 'member' | 'invitation'>('all')
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
    const [showHistory, setShowHistory] = useState(false)
    const [history, setHistory] = useState<any>(null)

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

            // Filter out staff members
            const filteredData = typedData.filter((p: Participant) => p.type !== 'staff')

            console.log('Participants data loaded:', {
                total: filteredData.length,
                delegates: filteredData.filter((p: Participant) => p.type === 'delegate').length,
                members: filteredData.filter((p: Participant) => p.type === 'member').length,
                invitations: filteredData.filter((p: Participant) => p.type === 'invitation').length
            })
            setParticipants(filteredData)
        } catch (err: any) {
            setError(err.message || 'Failed to load participants')
        } finally {
            setLoading(false)
        }
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
        <div className="jn-page">
            <div className="jn-shell px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto w-full overflow-x-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold mb-2">Participants</h1>
                            <p className="text-gray-600 text-sm sm:text-base">View delegates and members</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
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
                    <div className="jn-card p-4 mb-8" style={{ '--card-color': 'var(--jn-green)' } as CSSProperties}>
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
                    <div className="overflow-x-auto rounded-3xl border-2 border-[var(--jn-blue)] shadow-sm bg-white">
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
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${participant.type === 'delegate' ? 'bg-purple-100 text-purple-700' :
                                                    participant.type === 'invitation' ? 'bg-green-100 text-green-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {participant.type === 'delegate' ? 'Delegate' :
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
        </div>
    )
}
