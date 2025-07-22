'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import VoiceRecorder from './VoiceRecorder'
import VoiceVisualizer from './VoiceVisualizer'
import type { VoiceRecorderState, AudioLevel } from '@/types'

interface VoiceInterfaceProps {
  onUserInput: (text: string) => void
  onError: (error: string) => void
  disabled?: boolean
  className?: string
  prompt?: string
}

export default function VoiceInterface({
  onUserInput,
  onError,
  disabled = false,
  className,
  prompt = "Tap to talk with Emma"
}: VoiceInterfaceProps) {
  const [recorderState, setRecorderState] = useState<VoiceRecorderState>('idle')
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState<AudioLevel>(0)

  // Handle transcription result
  const handleTranscription = useCallback((text: string) => {
    setCurrentError(null)
    onUserInput(text)
  }, [onUserInput])

  // Handle recording errors
  const handleError = useCallback((error: string) => {
    setCurrentError(error)
    onError(error)
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setCurrentError(null)
    }, 5000)
  }, [onError])

  // Get prompt text based on state
  const getPromptText = () => {
    switch (recorderState) {
      case 'idle':
        return currentError || prompt
      case 'requesting-permission':
        return 'Please allow microphone access'
      case 'listening':
        return 'Listening... speak now'
      case 'processing':
        return 'Processing your message...'
      default:
        return prompt
    }
  }

  // Get prompt styling based on state and error
  const getPromptStyling = () => {
    if (currentError) {
      return 'text-crisis-600'
    }
    
    switch (recorderState) {
      case 'idle':
        return 'voice-prompt-text'
      case 'requesting-permission':
        return 'text-warm-600'
      case 'listening':
        return 'text-warm-700 font-semibold'
      case 'processing':
        return 'text-trust-600'
      default:
        return 'voice-prompt-text'
    }
  }

  return (
    <div className={cn('flex flex-col items-center space-y-6 p-6', className)}>
      {/* Voice Visualizer */}
      <div className="relative">
        <VoiceVisualizer
          state={recorderState}
          size="lg"
          className="mb-4"
        />
        
        {/* Voice Recorder overlaid on visualizer */}
        <div className="absolute inset-0 flex items-center justify-center">
          <VoiceRecorder
            state={recorderState}
            onStateChange={setRecorderState}
            onTranscription={handleTranscription}
            onError={handleError}
            disabled={disabled}
            className="relative z-10"
          />
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center max-w-sm">
        <p className={cn('transition-colors duration-200', getPromptStyling())}>
          {getPromptText()}
        </p>
        
        {/* Additional guidance for first-time users */}
        {recorderState === 'idle' && !currentError && (
          <p className="text-sm text-neutral-500 mt-2">
            Share what&apos;s on your mind - Emma is here to listen
          </p>
        )}
        
        {/* Error recovery guidance */}
        {currentError && (
          <p className="text-xs text-neutral-600 mt-2">
            Try checking your microphone settings or refresh the page
          </p>
        )}
      </div>

      {/* Accessibility instructions */}
      <div className="sr-only">
        <p>
          Voice interface for Emma AI. 
          {recorderState === 'idle' && 'Press the microphone button to start recording.'}
          {recorderState === 'listening' && 'Currently recording. Press the stop button when finished.'}
          {recorderState === 'processing' && 'Your audio is being processed.'}
        </p>
      </div>

      {/* Visual indicators for accessibility */}
      <div className="flex items-center justify-center space-x-2 opacity-60">
        <div className={cn(
          'w-2 h-2 rounded-full transition-colors duration-200',
          recorderState === 'idle' ? 'bg-trust-300' : 'bg-neutral-200'
        )} />
        <div className={cn(
          'w-2 h-2 rounded-full transition-colors duration-200',
          recorderState === 'listening' ? 'bg-warm-400' : 'bg-neutral-200'
        )} />
        <div className={cn(
          'w-2 h-2 rounded-full transition-colors duration-200',
          recorderState === 'processing' ? 'bg-trust-400' : 'bg-neutral-200'
        )} />
      </div>
    </div>
  )
}

// Hook to track recorder state changes
export function useVoiceRecorderState() {
  const [state, setState] = useState<VoiceRecorderState>('idle')
  
  return {
    state,
    setState,
    isIdle: state === 'idle',
    isListening: state === 'listening',
    isProcessing: state === 'processing',
    isRequestingPermission: state === 'requesting-permission'
  }
}