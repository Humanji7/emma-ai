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
  disabled?: boolean
  className?: string
}

export default function VoiceRecorder({
  state,
  onStateChange,
  onTranscription,
  onError,
  disabled = false,
  className
}: VoiceRecorderProps) {
  const [audioLevel, setAudioLevel] = useState<AudioLevel>(0)
  const [isSupported, setIsSupported] = useState(true)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined'
      const hasGetUserMedia = navigator.mediaDevices?.getUserMedia
      setIsSupported(hasMediaRecorder && !!hasGetUserMedia)
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
    
    // Update CSS variable for animations
    document.documentElement.style.setProperty('--audio-level', normalizedLevel.toString())
    
    if (state === 'listening') {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    }
  }, [state])

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported || disabled) {
      onError('Voice recording not supported in this browser')
      return
    }

    try {
      onStateChange('requesting-permission')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })
      
      // Setup audio context for level monitoring
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
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
          stream.getTracks().forEach(track => track.stop())
          
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
          document.documentElement.style.setProperty('--audio-level', '0')
        }
      }
      
      mediaRecorder.onerror = (event) => {
        onError('Recording failed. Please try again.')
        onStateChange('idle')
        console.error('MediaRecorder error:', event)
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      onStateChange('listening')
      
      // Start audio level monitoring
      updateAudioLevel()
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          onError('Microphone permission denied. Please allow microphone access.')
        } else if (error.name === 'NotFoundError') {
          onError('No microphone found. Please check your audio device.')
        } else {
          onError('Failed to access microphone. Please try again.')
        }
      }
      onStateChange('idle')
      console.error('getUserMedia error:', error)
    }
  }, [isSupported, disabled, onError, onTranscription, updateAudioLevel, onStateChange])

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Handle click
  const handleClick = () => {
    // Prevent multiple rapid clicks causing race conditions
    if (state === 'requesting-permission' || state === 'processing') {
      return
    }
    
    if (state === 'idle') {
      startRecording()
    } else if (state === 'listening') {
      stopRecording()
    }
  }

  // Render appropriate button based on state
  const renderButton = () => {
    const baseClasses = "voice-control-button touch-target focusable"
    
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

// Transcription function - will be moved to service layer
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')
  
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.text || ''
}