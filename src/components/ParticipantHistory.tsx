'use client'

import { useState, useEffect } from 'react'

interface HistoryEntry {
  type: string
  action: string
  details: string
  timestamp: string
  icon: string
}

interface HistoryData {
  participantId: string
  totalTransactions: number
  history: HistoryEntry[]
}

interface ParticipantHistoryProps {
  participantId: string
  participantName?: string
  isModal?: boolean
  onClose?: () => void
}

export default function ParticipantHistory({
  participantId,
  participantName,
  isModal = false,
  onClose
}: ParticipantHistoryProps) {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchHistory()
  }, [participantId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/participants/${participantId}/history`)
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }

      const data = await response.json()
      setHistoryData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'attendance': return 'bg-blue-100 text-blue-800'
      case 'food': return 'bg-green-100 text-green-800'
      case 'games': return 'bg-purple-100 text-purple-800'
      case 'bus': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return 'Unknown time'
    }
  }

  const content = (
    <div className={`${isModal ? 'max-h-96 overflow-y-auto' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Transaction History
          </h2>
          {participantName && (
            <p className="text-gray-600">
              {participantName} ({participantId})
            </p>
          )}
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading history...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={fetchHistory}
            className="mt-2 btn-secondary text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {historyData && !loading && (
        <div>
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {historyData.totalTransactions}
              </div>
              <div className="text-sm text-gray-600">Total Transactions</div>
            </div>
          </div>

          {/* History Timeline */}
          {historyData.history.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No History Found</h3>
              <p className="text-gray-600">
                This participant hasn't had any tracked activities yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const processedGames = new Set<string>();
                const filteredHistory = historyData.history.filter(entry => {
                  // Keep non-game entries
                  if (entry.type !== 'games') return true;

                  const actionLower = entry.action.toLowerCase();
                  let activityName = '';

                  // Valid games list
                  const validGames = [
                    'SPRPRK Subsoccer',
                    'SPRPRK Foosball',
                    'SPRPRK Music Tiles',
                    'Adrenaline Target Shooting'
                  ];

                  // Extract game name
                  if (actionLower.startsWith('join ')) {
                    activityName = entry.action.substring(5);
                  } else if (actionLower.startsWith('leave ')) {
                    // Ignore all leave events completely (as per user request)
                    return false;
                  } else {
                    return true; // Unknown game action, keep it
                  }

                  // Filter out invalid games
                  if (!validGames.some(g => activityName.includes(g) || g.toLowerCase() === activityName.toLowerCase())) {
                    // Strict check or partial match? Let's use exact match or includes to be safe, but given earlier code used exact strings...
                    // The validGames in backend were exact strings.
                    // activityName comes from 'join <Name>'. 
                    // Let's match loosely to be safe ("includes") or fix exact.
                    // Backend used: validGames.map(g => `'${g}'`).join(', ') -> Exact match in DB.
                    // The action string is `join ${activity}`.
                    // So activityName should be exactly one of the valid games.
                    if (!validGames.includes(activityName)) {
                      return false;
                    }
                  }

                  // Deduplicate: If we already saw this game, ignore it
                  // This ensures each game appears only once in the list ("Played")
                  if (processedGames.has(activityName)) {
                    return false;
                  }

                  processedGames.add(activityName);
                  return true;
                });

                return filteredHistory.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg">{entry.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(entry.type)}`}>
                          {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium capitalize">{entry.action}</span>
                        {entry.details && (
                          <span className="text-gray-600"> • {entry.details}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          {content}
        </div>
      </div>
    )
  }

  return <div className="card">{content}</div>
}