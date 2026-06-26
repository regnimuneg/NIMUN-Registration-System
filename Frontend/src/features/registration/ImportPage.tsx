import { useState } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../../lib/api'
import { Upload, CheckCircle, XCircle, RefreshCw, Download, FileText } from 'lucide-react'

export default function ImportPage() {
  const [csvData, setCsvData] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Read file content
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvData(content)
    }
    reader.readAsText(selectedFile)
  }

  const handleBulkImport = async () => {
    if (!csvData.trim()) {
      setError('Please upload a CSV file or paste CSV data')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await api.importCSV(csvData)
      setImportResult(result)
      setSuccess(`Imported ${result.summary?.success || 0} participants successfully!`)
      if (result.errors && result.errors.length > 0) {
        console.warn('Import errors:', result.errors)
      }
      // Clear form on success
      setCsvData('')
      setFile(null)
    } catch (err: any) {
      setError(err.message || 'Failed to import participants')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'Full Name,Phone Number,Committee,Gender\nJohn Doe,1234567890,Executive,Male\nJane Smith,0987654321,ICJ Delegates,Female\nAhmed Ali,1122334455,Operations,Female'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'participants_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Member committees (from schema)
  const memberCommittees = [
    'Executive',
    'Registration Affairs',
    'Socials & Events',
    'Public Relations',
    'Media & Design',
    'Operations & Logistics'
  ]

  // Delegate councils (from schema: HRC, ICJ, DISEC, PRESS)
  const delegateCouncils = [
    'HRC',
    'ICJ',
    'DISEC',
    'PRESS'
  ]

  const allCommittees = [...memberCommittees, ...delegateCouncils]

  return (
    <div className="jn-shell">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 inline-block">Bulk Import Participants</h1>
          <p className="text-gray-600 text-sm sm:text-base">Import multiple participants from a CSV file</p>
        </div>

        <div className="jn-card p-4 sm:p-6 mb-4 sm:mb-6" style={{ '--card-color': 'var(--jn-orange)' } as CSSProperties}>
          <img src="/element_14_x560_y415_w221_h216.png" alt="" aria-hidden="true" className="hidden sm:block jn-sticker -right-5 -top-6 rotate-12" />
          <div className="mb-6">
            <h2 className="text-lg font-black mb-4">CSV Format</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your CSV file should have the following columns:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border-2 border-orange-100">
              <code className="text-sm font-mono">
                Full Name, Phone Number, Committee, Gender
              </code>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <button
                onClick={downloadTemplate}
                className="jn-sticker-button flex items-center gap-2 px-4 py-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                style={{ '--button-color': 'var(--jn-blue)' } as CSSProperties}
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
              <p className="text-xs sm:text-sm text-gray-600">
                Download a sample CSV file to see the correct format
              </p>
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-[var(--jn-orange)] rounded-3xl p-6 sm:p-8 text-center hover:border-[var(--jn-blue)] transition-colors bg-white/70">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV file only</p>
                {file && (
                  <p className="text-sm text-blue-600 mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </label>
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Paste CSV Data
            </label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Full Name,Phone Number,Committee,Gender&#10;John Doe,1234567890,Executive,Male&#10;Jane Smith,0987654321,ICJ Delegates,Female"
              rows={8}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs sm:text-sm"
            />
          </div>

            <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Valid Committees & Councils:</h3>
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-600 mb-1">Member Committees:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {memberCommittees.map(committee => (
                  <span
                    key={committee}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                  >
                    {committee}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Delegate Councils:</p>
              <div className="flex flex-wrap gap-2">
                {delegateCouncils.map(council => (
                  <span
                    key={council}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                  >
                    {council}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleBulkImport}
            disabled={loading || !csvData.trim()}
            className="jn-sticker-button w-full px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-center gap-2 text-sm sm:text-base"
            style={{ '--button-color': 'var(--jn-green)' } as CSSProperties}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Participants
              </>
            )}
          </button>
        </div>

        {/* Import Result */}
        {importResult && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Import Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">{importResult.summary?.total || 0}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{importResult.summary?.success || 0}</p>
                <p className="text-sm text-gray-600">Success</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{importResult.summary?.failed || 0}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-600 mb-2">Errors:</p>
                <div className="max-h-40 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((err: string, idx: number) => (
                    <p key={idx} className="text-xs text-red-600 mb-1">{err}</p>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p className="text-xs text-gray-500">... and {importResult.errors.length - 10} more errors</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
