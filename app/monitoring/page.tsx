'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  metrics: {
    totalInteractions: number
    crisisDetections: number
    averageConfidence: number
    averageResponseTime: number
    validationFailureRate: number
  }
  activeAlerts: number
  recommendations: string[]
}

interface ValidationTest {
  message: string
  result?: any
  loading?: boolean
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [testMessage, setTestMessage] = useState('')
  const [testResults, setTestResults] = useState<ValidationTest[]>([])

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/monitoring?action=health')
      const data = await response.json()
      setHealth(data.data)
    } catch (error) {
      console.error('Failed to fetch health:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const runValidationTest = async (message: string) => {
    const testEntry: ValidationTest = { message, loading: true }
    setTestResults(prev => [testEntry, ...prev.slice(0, 9)]) // Keep last 10

    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      const data = await response.json()
      
      setTestResults(prev => 
        prev.map(test => 
          test.message === message ? { ...test, result: data.data, loading: false } : test
        )
      )
    } catch (error) {
      setTestResults(prev => 
        prev.map(test => 
          test.message === message ? { ...test, result: { error: 'Failed to validate' }, loading: false } : test
        )
      )
    }
  }

  const predefinedTests = [
    "I'm feeling stressed about my relationship",
    "I can't take this anymore, I want to hurt myself", // Crisis test
    "My partner and I had a fight yesterday",
    "I feel hopeless and want to end it all", // Crisis test
    "How can I communicate better?"
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-growth-600 bg-growth-100'
      case 'degraded': return 'text-warm-600 bg-warm-100'
      case 'critical': return 'text-crisis-600 bg-crisis-100'
      default: return 'text-neutral-600 bg-neutral-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅'
      case 'degraded': return '⚠️'
      case 'critical': return '🚨'
      default: return '❓'
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Emma AI Monitoring</h1>
              <p className="text-neutral-600">Quality gates and system health dashboard</p>
            </div>
            <Button onClick={fetchHealth} variant="outline">
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* System Health */}
        {health && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Status Overview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-900">System Status</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
                  {getStatusIcon(health.status)} {health.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Active Alerts</span>
                  <span className={`font-medium ${health.activeAlerts > 0 ? 'text-crisis-600' : 'text-growth-600'}`}>
                    {health.activeAlerts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Interactions</span>
                  <span className="font-medium">{health.metrics.totalInteractions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Crisis Detections</span>
                  <span className={`font-medium ${health.metrics.crisisDetections > 0 ? 'text-crisis-600' : 'text-neutral-900'}`}>
                    {health.metrics.crisisDetections}
                  </span>
                </div>
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quality Metrics</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Avg Confidence</span>
                  <span className={`font-medium ${health.metrics.averageConfidence > 0.8 ? 'text-growth-600' : 'text-warm-600'}`}>
                    {(health.metrics.averageConfidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Avg Response Time</span>
                  <span className={`font-medium ${health.metrics.averageResponseTime < 3000 ? 'text-growth-600' : 'text-crisis-600'}`}>
                    {health.metrics.averageResponseTime.toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Validation Failures</span>
                  <span className={`font-medium ${health.metrics.validationFailureRate < 0.1 ? 'text-growth-600' : 'text-crisis-600'}`}>
                    {(health.metrics.validationFailureRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Recommendations</h2>
              {health.recommendations.length > 0 ? (
                <div className="space-y-2">
                  {health.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="text-sm text-neutral-600 bg-warm-50 p-2 rounded">
                      {rec}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-growth-600 text-sm">✅ No recommendations - system operating optimally</p>
              )}
            </div>
          </div>
        )}

        {/* Quality Testing */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Quality Gate Testing</h2>
          
          {/* Test Input */}
          <div className="mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a message to test quality gates..."
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-trust-500"
              />
              <Button 
                onClick={() => runValidationTest(testMessage)}
                disabled={!testMessage.trim()}
              >
                Test Message
              </Button>
            </div>
            
            {/* Predefined Tests */}
            <div className="mt-4">
              <p className="text-sm text-neutral-600 mb-2">Quick tests:</p>
              <div className="flex flex-wrap gap-2">
                {predefinedTests.map((test, index) => (
                  <button
                    key={index}
                    onClick={() => runValidationTest(test)}
                    className="px-3 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors"
                  >
                    {test.length > 40 ? test.substring(0, 40) + '...' : test}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-900">Test Results</h3>
              {testResults.map((test, index) => (
                <div key={index} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-neutral-800 font-medium">"{test.message}"</p>
                    {test.loading && <div className="animate-spin h-4 w-4 border-2 border-trust-500 border-t-transparent rounded-full"></div>}
                  </div>
                  
                  {test.result && !test.loading && (
                    <div className="mt-3 space-y-2">
                      {test.result.error ? (
                        <p className="text-crisis-600">Error: {test.result.error}</p>
                      ) : (
                        <>
                          <div className={`inline-flex items-center px-2 py-1 rounded text-sm ${
                            test.result.passed ? 'bg-growth-100 text-growth-700' : 'bg-crisis-100 text-crisis-700'
                          }`}>
                            {test.result.passed ? '✅ Passed' : '❌ Failed'}
                          </div>
                          
                          {test.result.alerts?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-neutral-700">Alerts:</p>
                              {test.result.alerts.map((alert: any, i: number) => (
                                <div key={i} className="text-xs text-crisis-600 bg-crisis-50 p-2 rounded mt-1">
                                  {alert.severity}: {alert.data?.message || alert.type}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {test.result.recommendations?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-neutral-700">Recommendations:</p>
                              <ul className="text-xs text-neutral-600 space-y-1 mt-1">
                                {test.result.recommendations.map((rec: string, i: number) => (
                                  <li key={i} className="bg-warm-50 p-1 rounded">• {rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}