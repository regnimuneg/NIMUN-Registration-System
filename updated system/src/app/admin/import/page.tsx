'use client'

import { useState } from 'react'
import { parseCSVData, processBulkImport, generateImportSummary } from '@/lib/csvImport'
import { BulkImportData, Participant } from '@/types/participant'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<BulkImportData[]>([])
  const [previewData, setPreviewData] = useState<BulkImportData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const parsed = parseCSVData(text)
          setCsvData(parsed)
          setPreviewData(parsed.slice(0, 10)) // Show first 10 rows for preview
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error parsing CSV file')
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // Create FormData to send file to API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setImportResult(result)
      
      if (result.success) {
        console.log('Successfully imported participants:', result.participants)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing import')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Full Name,Gender,Phone Number,Committee
John Smith,Male,01234567890,Executive
Jane Doe,Female,01987654321,Operations
Ahmed Hassan,Male,01555123456,Public Relations`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'participant_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bulk Import Participants
        </h1>
        <p className="text-gray-600">
          Import participant data from CSV file. The system will automatically generate IDs and QR codes.
        </p>
      </div>

      {/* Instructions and Template Download */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Instructions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Required CSV Format:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Column headers: Full Name, Gender, Phone Number, Committee</li>
              <li>Gender must be either "Male" or "Female"</li>
              <li>Phone numbers should be unique</li>
              <li>Committee names will be mapped to standard committee types</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Supported Committees:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
              <span>• Executive (EX-XX)</span>
              <span>• Operations (OP-XX)</span>
              <span>• Registration Affairs (RG-XX)</span>
              <span>• Public Relations (PR-XX)</span>
              <span>• Media & Design (MD-XX)</span>
              <span>• Socials (SO-XX)</span>
              <span>• ICJ Delegates (IC-XX)</span>
              <span>• UNOOSA Delegates (OS-XX)</span>
              <span>• DISEC Delegates (DC-XX)</span>
              <span>• Press Delegates (PS-XX)</span>
              <span>• UN Women Delegates (UW-XX)</span>
              <span>• UNODC Delegates (OD-XX)</span>
            </div>
          </div>
          <button 
            onClick={downloadTemplate}
            className="btn-secondary"
          >
            Download CSV Template
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
        <div className="space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="form-input w-full"
          />
          {file && (
            <p className="text-sm text-gray-600">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
          <div className="flex">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {/* Preview Data */}
      {previewData.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Preview ({csvData.length} total rows, showing first {previewData.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Committee
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.gender}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.committee}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex justify-between">
            <span className="text-sm text-gray-600">
              Ready to import {csvData.length} participants
            </span>
            <button
              onClick={handleImport}
              disabled={isProcessing}
              className={`btn-primary ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? 'Processing...' : 'Import Participants'}
            </button>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Import Results</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
            {generateImportSummary(importResult)}
          </pre>
          
          {importResult.participants.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Successfully Imported Participants:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Generated ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importResult.participants.slice(0, 20).map((participant: Participant) => (
                      <tr key={participant.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {participant.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.phoneNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importResult.participants.length > 20 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Showing first 20 of {importResult.participants.length} imported participants
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 