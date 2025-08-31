import React, { useState, useEffect } from 'react'
import { authDiagnostics } from '../utils/authDiagnostics'
import { useAuth } from '../contexts/auth'

const AuthDiagnostics = () => {
  const [diagnosticResults, setDiagnosticResults] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [manualTests, setManualTests] = useState({})
  const { user, tokens } = useAuth()

  const runDiagnostics = async () => {
    setIsRunning(true)
    try {
      const results = await authDiagnostics.runAllTests()
      setDiagnosticResults(results)
    } catch (error) {
      console.error('Diagnostics failed:', error)
      setDiagnosticResults({ error: error.message })
    } finally {
      setIsRunning(false)
    }
  }

  const runManualTest = async (testName) => {
    setManualTests(prev => ({ ...prev, [testName]: { running: true } }))
    
    try {
      let result
      switch (testName) {
        case 'session':
          result = await authDiagnostics.checkSession()
          break
        case 'profilesTable':
          result = await authDiagnostics.checkProfilesTable()
          break
        case 'profileFetch':
          result = await authDiagnostics.testProfileFetch()
          break
        case 'crossDomain':
          result = await authDiagnostics.testCrossDomainAuth()
          break
        default:
          result = { error: 'Unknown test' }
      }
      
      setManualTests(prev => ({ 
        ...prev, 
        [testName]: { running: false, result } 
      }))
    } catch (error) {
      setManualTests(prev => ({ 
        ...prev, 
        [testName]: { running: false, error: error.message } 
      }))
    }
  }

  const formatJson = (obj) => {
    return JSON.stringify(obj, null, 2)
  }

  const getStatusIcon = (success) => {
    return success ? '✅' : '❌'
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Authentication Diagnostics
        </h1>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Current Auth State
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Domain:</strong> {window.location.hostname}
            </div>
            <div>
              <strong>User:</strong> {user ? user.email : 'Not authenticated'}
            </div>
            <div>
              <strong>User ID:</strong> {user ? user.id : 'N/A'}
            </div>
            <div>
              <strong>Has Tokens:</strong> {tokens ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => runManualTest('session')}
            disabled={manualTests.session?.running}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            {manualTests.session?.running ? 'Testing...' : 'Test Session'}
          </button>
          
          <button
            onClick={() => runManualTest('profilesTable')}
            disabled={manualTests.profilesTable?.running}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            {manualTests.profilesTable?.running ? 'Testing...' : 'Test Profiles Table'}
          </button>
          
          <button
            onClick={() => runManualTest('profileFetch')}
            disabled={manualTests.profileFetch?.running}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            {manualTests.profileFetch?.running ? 'Testing...' : 'Test Profile Fetch'}
          </button>
          
          <button
            onClick={() => runManualTest('crossDomain')}
            disabled={manualTests.crossDomain?.running}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            {manualTests.crossDomain?.running ? 'Testing...' : 'Test Cross-Domain'}
          </button>
        </div>

        {/* Manual Test Results */}
        {Object.keys(manualTests).length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Manual Test Results
            </h2>
            <div className="space-y-4">
              {Object.entries(manualTests).map(([testName, testData]) => (
                <div key={testName} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2 capitalize">
                    {testName} Test
                  </h3>
                  {testData.running ? (
                    <div className="text-blue-600">Running...</div>
                  ) : testData.error ? (
                    <div className="text-red-600">Error: {testData.error}</div>
                  ) : (
                    <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                      {formatJson(testData.result)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Diagnostic Results */}
        {diagnosticResults && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Full Diagnostic Results
            </h2>
            
            {diagnosticResults.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-800 font-medium">Error running diagnostics:</div>
                <div className="text-red-600 mt-1">{diagnosticResults.error}</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                {diagnosticResults.summary && (
                  <div className={`p-4 rounded-lg ${
                    diagnosticResults.summary.status === 'ALL_GOOD' 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <h3 className="font-semibold text-lg mb-3">
                      {diagnosticResults.summary.status === 'ALL_GOOD' ? '✅ All Good!' : '⚠️ Issues Found'}
                    </h3>
                    
                    {diagnosticResults.summary.successes.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium text-green-800 mb-1">Successes:</h4>
                        <ul className="list-disc list-inside text-green-700 text-sm">
                          {diagnosticResults.summary.successes.map((success, index) => (
                            <li key={index}>{success}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {diagnosticResults.summary.issues.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium text-red-800 mb-1">Issues:</h4>
                        <ul className="list-disc list-inside text-red-700 text-sm">
                          {diagnosticResults.summary.issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {diagnosticResults.summary.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-800 mb-1">Recommendations:</h4>
                        <ul className="list-disc list-inside text-blue-700 text-sm">
                          {diagnosticResults.summary.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Detailed Results */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Detailed Results</h3>
                  <div className="space-y-4">
                    {Object.entries(diagnosticResults.tests).map(([testName, testResult]) => (
                      <div key={testName} className="bg-white p-3 rounded border">
                        <h4 className="font-medium text-gray-900 mb-2 capitalize">
                          {testName.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                          {formatJson(testResult)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthDiagnostics