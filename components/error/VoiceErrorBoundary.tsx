'use client'

import React, { ReactNode } from 'react'
import { Mic, MicOff, AlertTriangle, RefreshCw } from 'lucide-react'
import { ComponentErrorBoundary } from './ErrorBoundary'

interface VoiceErrorFallbackProps {
  onRetry?: () => void
  onFallback?: () => void
}

/**
 * Voice-specific error fallback component
 * Provides graceful degradation to text input when voice fails
 */
const VoiceErrorFallback: React.FC<VoiceErrorFallbackProps> = ({ 
  onRetry, 
  onFallback 
}) => (
  <div className="bg-warm-amber-50 border border-warm-amber-200 rounded-xl p-6">
    <div className="text-center">
      <div className="w-16 h-16 bg-warm-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <MicOff className="w-8 h-8 text-warm-amber-600" />
      </div>
      
      <h3 className="text-lg font-medium text-warm-amber-800 mb-2">
        Voice Processing Unavailable
      </h3>
      
      <p className="text-warm-amber-700 mb-6">
        Don&apos;t worry! You can still chat with Emma using text while we fix the voice feature.
      </p>

      <div className="space-y-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 bg-warm-amber-600 text-white rounded-lg hover:bg-warm-amber-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Mic className="w-4 h-4" />
            <span>Try Voice Again</span>
          </button>
        )}
        
        {onFallback && (
          <button
            onClick={onFallback}
            className="w-full px-4 py-2 bg-trust-blue-600 text-white rounded-lg hover:bg-trust-blue-700 transition-colors"
          >
            Continue with Text
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-warm-amber-100 rounded-lg">
        <p className="text-xs text-warm-amber-700">
          💡 <strong>Tip:</strong> Make sure your microphone is connected and you&apos;ve granted permission to access it.
        </p>
      </div>
    </div>
  </div>
)

interface VoiceErrorBoundaryProps {
  children: ReactNode
  onVoiceError?: () => void
  onFallbackToText?: () => void
}

/**
 * Voice-aware error boundary that provides fallback to text input
 */
export const VoiceErrorBoundary: React.FC<VoiceErrorBoundaryProps> = ({
  children,
  onVoiceError,
  onFallbackToText
}) => {
  const handleVoiceError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.log('Voice error detected, offering fallback options', error)
    onVoiceError?.()
  }

  return (
    <ComponentErrorBoundary
      context="voice-processing"
      fallback={
        <VoiceErrorFallback
          onRetry={() => window.location.reload()}
          onFallback={onFallbackToText}
        />
      }
    >
      {children}
    </ComponentErrorBoundary>
  )
}

/**
 * Crisis-aware voice error boundary
 * Ensures crisis detection remains functional even if voice fails
 */
export const CrisisAwareVoiceErrorBoundary: React.FC<{
  children: ReactNode
  onCrisisDetected?: () => void
}> = ({ children, onCrisisDetected }) => {
  const CrisisAwareFallback = () => (
    <div className="bg-crisis-red-50 border border-crisis-red-200 rounded-xl p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-crisis-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-crisis-red-600" />
        </div>
        
        <h3 className="text-lg font-medium text-crisis-red-800 mb-2">
          Voice Feature Unavailable
        </h3>
        
        <p className="text-crisis-red-700 mb-4">
          I&apos;m here to help you. Let&apos;s continue our conversation with text.
        </p>

        <div className="bg-white rounded-lg p-4 mb-4">
          <textarea
            className="w-full h-24 p-3 border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-trust-blue-300"
            placeholder="Type your message here..."
          />
          <button className="mt-3 w-full px-4 py-2 bg-trust-blue-600 text-white rounded-lg hover:bg-trust-blue-700 transition-colors">
            Send Message
          </button>
        </div>

        {/* Always show crisis resources */}
        <div className="bg-crisis-red-100 rounded-lg p-3">
          <p className="text-xs text-crisis-red-700">
            <strong>Need immediate help?</strong> Call 988 (Crisis Line) or text HOME to 741741
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <ComponentErrorBoundary
      context="crisis-voice-processing"
      fallback={<CrisisAwareFallback />}
    >
      {children}
    </ComponentErrorBoundary>
  )
}

export default VoiceErrorBoundary