'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { VoiceRecorderState, AudioLevel } from '@/types'

interface VoiceVisualizerProps {
  state: VoiceRecorderState
  audioLevel?: AudioLevel
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function VoiceVisualizer({
  state,
  audioLevel = 0,
  size = 'md',
  className
}: VoiceVisualizerProps) {
  const [displayLevel, setDisplayLevel] = useState<AudioLevel>(0)

  // Smooth audio level transitions
  useEffect(() => {
    if (state === 'listening' && audioLevel !== displayLevel) {
      // Smooth transition for better UX
      const transition = setTimeout(() => {
        setDisplayLevel(audioLevel)
      }, 50)
      
      return () => clearTimeout(transition)
    } else if (state !== 'listening') {
      setDisplayLevel(0)
      return undefined
    }
    return undefined
  }, [audioLevel, displayLevel, state])

  // Update CSS variable for audio-responsive animation
  useEffect(() => {
    document.documentElement.style.setProperty('--audio-level', displayLevel.toString())
  }, [displayLevel])

  // Size classes
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32', 
    xl: 'w-40 h-40'
  }

  // State-based styling
  const getStateClasses = () => {
    switch (state) {
      case 'idle':
        return 'voice-visualizer--idle'
      case 'requesting-permission':
        return 'voice-visualizer--idle opacity-60'
      case 'listening':
        return 'voice-visualizer--listening'
      case 'processing':
        return 'voice-visualizer--processing'
      default:
        return 'voice-visualizer--idle'
    }
  }

  // Inner content based on state
  const renderInnerContent = () => {
    const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 28
    
    switch (state) {
      case 'idle':
        return (
          <div className="text-trust-500">
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
              <line x1="8" x2="16" y1="22" y2="22"/>
            </svg>
          </div>
        )
        
      case 'requesting-permission':
        return (
          <div className="text-trust-400 animate-pulse">
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
              <line x1="8" x2="16" y1="22" y2="22"/>
            </svg>
          </div>
        )
        
      case 'listening':
        return (
          <div className="text-warm-600">
            {/* Audio level visualization bars */}
            <div className="flex items-end justify-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-current rounded-full transition-all duration-75"
                  style={{
                    width: '2px',
                    height: `${8 + (displayLevel * 20) + (Math.sin(Date.now() / 200 + i) * 4)}px`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
              ))}
            </div>
          </div>
        )
        
      case 'processing':
        return (
          <div className="text-trust-600">
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        'voice-visualizer',
        sizeClasses[size],
        getStateClasses(),
        className
      )}
      role="status"
      aria-label={`Voice recorder is ${state}`}
    >
      {renderInnerContent()}
      
      {/* Audio level indicator ring for listening state */}
      {state === 'listening' && (
        <div
          className="absolute inset-0 rounded-full border-2 border-warm-400"
          style={{
            transform: `scale(${1 + displayLevel * 0.2})`,
            opacity: 0.6 + displayLevel * 0.4,
            transition: 'all 0.1s ease-out'
          }}
        />
      )}
      
      {/* Pulse indicators for different states */}
      {state === 'idle' && (
        <div className="absolute inset-0 rounded-full border border-trust-200 animate-ping opacity-20" />
      )}
      
      {state === 'processing' && (
        <>
          <div className="absolute inset-0 rounded-full border border-trust-300 animate-ping opacity-30" />
          <div 
            className="absolute inset-0 rounded-full border border-trust-400 animate-ping opacity-20"
            style={{ animationDelay: '0.5s' }}
          />
        </>
      )}
    </div>
  )
}