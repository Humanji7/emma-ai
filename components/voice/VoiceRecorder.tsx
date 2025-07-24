'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VoiceRecorderState, AudioLevel } from '@/types'

interface VoiceRecorderProps {
  state: VoiceRecorderState
  onStateChange: (state: VoiceRecorderState) => void
  onTranscription: (text: string) => void
  onError: (error: string) => void
  onAudioLevel?: (level: AudioLevel) => void
  disabled?: boolean
  className?: string
}

export default function VoiceRecorder({
  state,
  onStateChange,
  onTranscription,
  onError,
  onAudioLevel,
  disabled = false,
  className
}: VoiceRecorderProps) {
  const [audioLevel, setAudioLevel] = useState<AudioLevel>(0)
  const [isSupported, setIsSupported] = useState(true)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  // Check browser support with debug
  useEffect(() => {
    const checkSupport = () => {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined'
      const hasGetUserMedia = navigator.mediaDevices?.getUserMedia
      const supported = hasMediaRecorder && !!hasGetUserMedia
      
      console.log('🎤 Browser support check:', {
        hasMediaRecorder,
        hasGetUserMedia: !!hasGetUserMedia,
        supported,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent.substring(0, 50)
      })
      
      setIsSupported(supported)
    }
    
    checkSupport()
  }, [])

  // Audio level monitoring for visualizer
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    // Calculate average audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const normalizedLevel = Math.min(average / 128, 1) as AudioLevel
    
    setAudioLevel(normalizedLevel)
    
    // Notify parent component of audio level changes
    onAudioLevel?.(normalizedLevel)
    
    // Update CSS variable for animations
    document.documentElement.style.setProperty('--audio-level', normalizedLevel.toString())
    
    if (state === 'listening') {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    }
  }, [state])

  // Start recording
  const startRecording = useCallback(async () => {
    console.log('🎤 startRecording called:', { isSupported, disabled, state })
    
    if (!isSupported || disabled) {
      console.error('🎤 Recording blocked:', { isSupported, disabled })
      onError('Voice recording not supported in this browser')
      return
    }

    try {
      console.log('🎤 Setting state to requesting-permission')
      onStateChange('requesting-permission')
      
      console.log('🎤 Requesting media access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })
      
      console.log('🎤 Media access granted, stream:', stream)
      
      // Setup audio context for level monitoring
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)
      
      // Store stream reference for cleanup
      streamRef.current = stream
      
      // Get supported MIME type with fallbacks
      const getSupportedMimeType = () => {
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/wav'
        ]
        return types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm'
      }
      
      // Setup MediaRecorder with browser compatibility
      const supportedMimeType = getSupportedMimeType()
      console.log('🎤 Using MIME type:', supportedMimeType)
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType
      })
      
      console.log('🎤 MediaRecorder created successfully')
      
      const audioChunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
          
          // Only process if we have audio data
          if (audioBlob.size === 0) {
            onError('No audio recorded. Please try again.')
            onStateChange('idle')
            return
          }
          
          onStateChange('processing')
          
          // Send to transcription service with timeout
          const transcriptionText = await Promise.race([
            transcribeAudio(audioBlob),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Transcription timeout')), 30000)
            )
          ])
          
          if (transcriptionText && transcriptionText.trim()) {
            onTranscription(transcriptionText)
          } else {
            onError('No speech detected. Please try speaking louder.')
          }
        } catch (error) {
          console.error('Transcription error:', error)
          if (error instanceof Error && error.message.includes('timeout')) {
            onError('Request timed out. Please try again.')
          } else {
            onError('Failed to process audio. Please check your connection.')
          }
        } finally {
          onStateChange('idle')
          setAudioLevel(0)
          onAudioLevel?.(0)
          document.documentElement.style.setProperty('--audio-level', '0')
        }
      }
      
      mediaRecorder.onerror = (event) => {
        onError('Recording failed. Please try again.')
        onStateChange('idle')
        console.error('MediaRecorder error:', event)
      }
      
      console.log('🎤 Setting up MediaRecorder events and starting...')
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      console.log('🎤 MediaRecorder.start() called')
      
      onStateChange('listening')
      console.log('🎤 State changed to listening')
      
      // Start audio level monitoring
      updateAudioLevel()
      console.log('🎤 Audio monitoring started')
      
    } catch (error) {
      console.error('🎤 Error in startRecording:', error)
      
      if (error instanceof Error) {
        console.log('🎤 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 200)
        })
        
        if (error.name === 'NotAllowedError') {
          onError('Microphone permission denied. Please allow microphone access.')
        } else if (error.name === 'NotFoundError') {
          onError('No microphone found. Please check your audio device.')
        } else {
          onError(`Failed to access microphone: ${error.message}`)
        }
      } else {
        onError('Unknown error occurred while accessing microphone.')
      }
      
      onStateChange('idle')
      console.error('getUserMedia error:', error)
    }
  }, [isSupported, disabled, onError, onTranscription, onAudioLevel, updateAudioLevel, onStateChange])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'listening') {
      mediaRecorderRef.current.stop()
      
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [state])

  // Development mode state reset for hot reload issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Reset state on hot reload or component remount
      const handleBeforeUnload = () => {
        console.log('🎤 Development beforeunload - resetting state')
        onStateChange('idle')
        setAudioLevel(0)
        document.documentElement.style.setProperty('--audio-level', '0')
      }
      
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    
    // Return empty cleanup function for non-development
    return () => {}
  }, [onStateChange])  // Removed 'state' dependency to prevent reset on state change

  // Cleanup on unmount with comprehensive cleanup
  useEffect(() => {
    return () => {
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current = null
      }
      
      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Handle click with debug logging
  const handleClick = () => {
    console.log('🎤 VoiceRecorder click:', { state, disabled, isSupported })
    
    // Prevent multiple rapid clicks causing race conditions
    if (state === 'requesting-permission' || state === 'processing') {
      console.log('🎤 Click ignored - in progress state')
      return
    }
    
    if (state === 'idle') {
      console.log('🎤 Starting recording...')
      startRecording()
    } else if (state === 'listening') {
      console.log('🎤 Stopping recording...')
      stopRecording()
    }
  }

  // Render appropriate button based on state
  const renderButton = () => {
    const baseClasses = "voice-control-button touch-target focusable"
    
    console.log('🎤 Rendering button for state:', state)
    
    switch (state) {
      case 'idle':
        return (
          <button
            onClick={handleClick}
            disabled={disabled || !isSupported}
            className={cn(baseClasses, "voice-control-button--primary", className)}
            aria-label="Start voice recording"
          >
            <Mic size={24} />
          </button>
        )
        
      case 'requesting-permission':
        return (
          <button
            disabled
            className={cn(baseClasses, "voice-control-button--secondary", className)}
            aria-label="Requesting microphone permission"
          >
            <Mic size={24} className="animate-pulse" />
          </button>
        )
        
      case 'listening':
        return (
          <button
            onClick={handleClick}
            className={cn(baseClasses, "voice-control-button--danger", className)}
            style={{ backgroundColor: 'red', color: 'white' }} // Force red color
            aria-label="Stop voice recording"
          >
            <Square size={20} />
          </button>
        )
        
      case 'processing':
        return (
          <button
            disabled
            className={cn(baseClasses, "voice-control-button--secondary", className)}
            aria-label="Processing audio"
          >
            <MicOff size={24} className="animate-pulse" />
          </button>
        )
        
      default:
        return null
    }
  }

  if (!isSupported) {
    return (
      <div className="text-center p-4">
        <p className="text-crisis-600 text-sm">
          Voice recording not supported in this browser
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      {renderButton()}
      
      {/* Development Debug Controls */}
      {process.env.NODE_ENV === 'development' && state !== 'idle' && (
        <button
          onClick={() => {
            onStateChange('idle')
            setAudioLevel(0)
            document.documentElement.style.setProperty('--audio-level', '0')
            // Force cleanup
            if (mediaRecorderRef.current) {
              try {
                mediaRecorderRef.current.stop()
              } catch (e) {
                console.log('MediaRecorder already stopped')
              }
              mediaRecorderRef.current = null
            }
            if (audioContextRef.current) {
              audioContextRef.current.close()
              audioContextRef.current = null
            }
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
              animationFrameRef.current = null
            }
          }}
          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          title="Emergency reset for development"
        >
          🔄 Reset State
        </button>
      )}
      
      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite">
        {state === 'idle' && 'Ready to record'}
        {state === 'requesting-permission' && 'Requesting microphone permission'}
        {state === 'listening' && 'Recording your voice'}
        {state === 'processing' && 'Processing your audio'}
      </div>
    </div>
  )
}

// Transcription function using API route with better error handling
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('language', 'en')
  
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(errorData.error || `Transcription failed: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.text || ''
}