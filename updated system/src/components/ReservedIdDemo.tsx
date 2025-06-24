'use client'

import { useState } from 'react'
import { generateParticipantId, getReservedIdForName, initializeCountersFromExisting } from '@/lib/idGenerator'
import { CommitteeType } from '@/types/participant'

export default function ReservedIdDemo() {
  const [testName, setTestName] = useState('')
  const [committee] = useState<CommitteeType>('Executive')
  const [result, setResult] = useState<string>('')
  const [generatedIds, setGeneratedIds] = useState<string[]>([])

  const handleTest = () => {
    try {
      // Initialize with existing IDs (empty for demo)
      initializeCountersFromExisting(generatedIds)
      
      // Generate ID
      const id = generateParticipantId(committee, testName)
      setResult(`Generated ID: ${id}`)
      setGeneratedIds(prev => [...prev, id])
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const checkReserved = () => {
    const reservedId = getReservedIdForName(testName)
    if (reservedId) {
      setResult(`Reserved ID found: ${reservedId}`)
    } else {
      setResult(`No reserved ID for "${testName}"`)
    }
  }

  const reset = () => {
    setGeneratedIds([])
    setResult('')
    setTestName('')
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">🔒 Reserved ID Testing</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Name:</label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Enter name (try: zein raafat, abdallah emam, adham abdelaal)"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Generate ID
          </button>
          <button
            onClick={checkReserved}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Check Reserved
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset
          </button>
        </div>

        {result && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <strong>Result:</strong> {result}
          </div>
        )}

        {generatedIds.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Generated IDs:</h4>
            <div className="space-y-1">
              {generatedIds.map((id, index) => (
                <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                  {id}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-600 bg-yellow-50 p-3 rounded">
          <strong>Reserved IDs:</strong>
          <ul className="list-disc list-inside mt-1">
            <li>zein raafat → EX-01</li>
            <li>abdallah emam → EX-02</li>
            <li>adham abdelaal → EX-03</li>
          </ul>
          <p className="mt-2">
            <strong>Features:</strong> Names are case-insensitive. Deleted IDs are never reused. Regular IDs skip over reserved ones.
          </p>
        </div>
      </div>
    </div>
  )
} 