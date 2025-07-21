'use client'

import { useState } from 'react'
import VoiceRecorder from './VoiceRecorder'
import VoiceVisualizer from './VoiceVisualizer'
import type { VoiceRecorderState, AudioLevel } from '@/types'

interface VoiceRecorderWithStateProps {
  onTranscription: (text: string) => void
  onError: (error: string) => void
  disabled?: boolean
  className?: string
}

export default function VoiceRecorderWithState({
  onTranscription,
  onError,
  disabled = false,
  className
}: VoiceRecorderWithStateProps) {
  const [state, setState] = useState<VoiceRecorderState>('idle')
  const [audioLevel, setAudioLevel] = useState<AudioLevel>(0)

  // Create a wrapped recorder that manages state
  const WrappedRecorder = () => {
    // Hook into VoiceRecorder lifecycle
    const originalOnTranscription = (text: string) => {
      setState('idle')
      onTranscription(text)
    }

    const originalOnError = (error: string) => {
      setState('idle')
      onError(error)
    }

    return (
      <div className="relative">
        <VoiceVisualizer
          state={state}
          audioLevel={audioLevel}
          size="lg"
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            onClick={() => {
              if (state === 'idle') {
                setState('requesting-permission')
              } else if (state === 'listening') {
                setState('processing')
              }
            }}
          >
            <VoiceRecorder
              onTranscription={originalOnTranscription}
              onError={originalOnError}
              disabled={disabled}
              className="relative z-10"
            />
          </div>
        </div>
      </div>
    )
  }

  return <WrappedRecorder />
}