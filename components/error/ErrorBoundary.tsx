'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, MessageCircle, Phone } from 'lucide-react'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'critical'
  context?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
}

/**
 * Enhanced Error Boundary for Emma AI
 * Provides graceful degradation with crisis-aware fallbacks
 */
export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3
  
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state to trigger fallback UI
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(7)
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with context
    console.error('ErrorBoundary caught error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      context: this.props.context,
      level: this.props.level,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    })

    // Update state with error details
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Send error to monitoring system
    this.reportError(error, errorInfo)
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Report to monitoring API
      await fetch('/api/monitoring/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo,
          context: this.props.context,
          level: this.props.level,
          errorId: this.state.errorId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private renderCriticalError = () => (
    <div className="min-h-screen bg-gradient-to-br from-crisis-red-50 to-trust-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="w-16 h-16 bg-crisis-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-crisis-red-600" />
        </div>
        
        <h1 className="text-xl font-semibold text-neutral-800 mb-2">
          System Temporarily Unavailable
        </h1>
        
        <p className="text-neutral-600 mb-6">
          Emma AI is experiencing technical difficulties. Your safety is our priority.
        </p>

        {/* Crisis Resources - Always Available */}
        <div className="bg-crisis-red-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-crisis-red-800 mb-2">
            Need Immediate Help?
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-center space-x-2">
              <Phone className="w-4 h-4 text-crisis-red-600" />
              <span className="text-crisis-red-700">Crisis Line: 988</span>
            </div>
            <div className="text-crisis-red-600">
              Text HOME to 741741
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {this.state.retryCount < this.maxRetries && (
            <button
              onClick={this.handleRetry}
              className="w-full px-4 py-2 bg-trust-blue-600 text-white rounded-lg hover:bg-trust-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}
          
          <button
            onClick={this.handleReload}
            className="w-full px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
          >
            Reload Page
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-neutral-100 rounded-lg text-left">
            <details>
              <summary className="text-sm font-medium cursor-pointer">
                Error Details (Dev)
              </summary>
              <pre className="mt-2 text-xs text-neutral-600 overflow-auto">
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        )}

        <div className="mt-4 text-xs text-neutral-500">
          Error ID: {this.state.errorId}
        </div>
      </div>
    </div>
  )

  private renderComponentError = () => (
    <div className="bg-warm-amber-50 border border-warm-amber-200 rounded-lg p-4 my-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-warm-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-warm-amber-800">
            Component Unavailable
          </h3>
          <p className="text-sm text-warm-amber-700 mt-1">
            This feature is temporarily unavailable. You can continue using other parts of Emma AI.
          </p>
          
          {this.state.retryCount < this.maxRetries && (
            <button
              onClick={this.handleRetry}
              className="mt-3 text-sm text-warm-amber-700 hover:text-warm-amber-800 underline flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )

  private renderPageError = () => (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border p-6 text-center">
        <div className="w-12 h-12 bg-warm-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-6 h-6 text-warm-amber-600" />
        </div>
        
        <h1 className="text-lg font-semibold text-neutral-800 mb-2">
          Something went wrong
        </h1>
        
        <p className="text-neutral-600 mb-6">
          This page encountered an error. Emma AI is still available through other pages.
        </p>

        <div className="space-y-3">
          {this.state.retryCount < this.maxRetries && (
            <button
              onClick={this.handleRetry}
              className="w-full px-4 py-2 bg-trust-blue-600 text-white rounded-lg hover:bg-trust-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry ({this.maxRetries - this.state.retryCount} attempts left)</span>
            </button>
          )}
          
          <a
            href="/"
            className="block w-full px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
          >
            Return Home
          </a>
        </div>

        <div className="mt-4 text-xs text-neutral-500">
          Error ID: {this.state.errorId}
        </div>
      </div>
    </div>
  )

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Level-specific error UIs
      switch (this.props.level) {
        case 'critical':
          return this.renderCriticalError()
        case 'page':
          return this.renderPageError()
        case 'component':
        default:
          return this.renderComponentError()
      }
    }

    return this.props.children
  }
}

// Convenient wrapper components
export const CriticalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="critical" context="application">
    {children}
  </ErrorBoundary>
)

export const PageErrorBoundary: React.FC<{ children: ReactNode; context?: string }> = ({ 
  children, 
  context = 'page' 
}) => (
  <ErrorBoundary level="page" context={context}>
    {children}
  </ErrorBoundary>
)

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode
  context?: string
  fallback?: ReactNode
}> = ({ children, context = 'component', fallback }) => (
  <ErrorBoundary level="component" context={context} fallback={fallback}>
    {children}
  </ErrorBoundary>
)

export default ErrorBoundary