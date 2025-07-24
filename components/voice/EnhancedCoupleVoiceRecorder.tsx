'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Square, Users, UserCheck, Settings, Zap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calibratedSpeakerDetectionService } from '@/services/CalibratedSpeakerDetectionService'
import VoiceCalibrationWizard from './VoiceCalibrationWizard'
import type { 
  VoiceRecorderState, 
  AudioLevel, 
  Speaker, 
  CoupleAudioState,
  SpeakerDetectionMode,
  VADResult
} from '@/types'
import type { 
  CalibrationStatusInfo
} from '@/services/CalibratedSpeakerDetectionService'
import type { 
  CalibrationCompletionResult 
} from '@/services/VoiceCalibrationService'

interface EnhancedCoupleVoiceRecorderProps {
  state: VoiceRecorderState
  onStateChange: (state: VoiceRecorderState) => void
  onTranscription: (text: string, speaker: Speaker) => void
  onError: (error: string) => void
  onAudioLevel?: (levelA: AudioLevel, levelB: AudioLevel) => void
  onSpeakerChange?: (speaker: Speaker) => void
  disabled?: boolean
  className?: string
  coupleMode?: boolean
  detectionMode?: SpeakerDetectionMode
  pauseThreshold?: number
}

export default function EnhancedCoupleVoiceRecorder({
  state,
  onStateChange,
  onTranscription,
  onError,
  onAudioLevel,
  onSpeakerChange,
  disabled = false,
  className,
  coupleMode = true,
  detectionMode = 'hybrid',
  pauseThreshold = 400
}: EnhancedCoupleVoiceRecorderProps) {
  
  // Core state
  const [coupleAudioState, setCoupleAudioState] = useState<CoupleAudioState>({
    currentSpeaker: 'silence',
    speakerHistory: [],
    audioLevelA: 0,
    audioLevelB: 0,
    vadEnabled: true,
    manualMode: false,
    detectionMode,
    pauseThreshold,
    confidenceThreshold: 0.6
  })

  // Calibration state
  const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatusInfo | null>(null)
  const [detectionStats, setDetectionStats] = useState<any>(null)
  const [recalibrationAssessment, setRecalibrationAssessment] = useState<any>(null)
  const [showCalibrationWizard, setShowCalibrationWizard] = useState(false)
  const [lastDetectionResult, setLastDetectionResult] = useState<any>(null)
  
  // Audio processing refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Initialize calibrated detection service
  useEffect(() => {
    if (coupleMode) {
      calibratedSpeakerDetectionService.initialize().then(() => {
        const status = calibratedSpeakerDetectionService.getCalibrationStatus()
        const stats = calibratedSpeakerDetectionService.getDetectionStats()
        const assessment = calibratedSpeakerDetectionService.shouldRecalibrate()
        
        setCalibrationStatus(status)
        setDetectionStats(stats)
        setRecalibrationAssessment(assessment)
        console.log('🎯 Calibrated detection service initialized:', status)
      }).catch(error => {
        console.error('Failed to initialize calibrated detection:', error)
        onError('Failed to initialize voice detection system')
      })
    }
    
    return () => {
      calibratedSpeakerDetectionService.cleanup()
    }
  }, [coupleMode, onError])

  // Update calibration status periodically
  useEffect(() => {
    if (!coupleMode) return

    const interval = setInterval(() => {
      const status = calibratedSpeakerDetectionService.getCalibrationStatus()
      const stats = calibratedSpeakerDetectionService.getDetectionStats()
      const assessment = calibratedSpeakerDetectionService.shouldRecalibrate()
      
      setCalibrationStatus(status)
      setDetectionStats(stats)
      setRecalibrationAssessment(assessment)
    }, 5000)

    return () => clearInterval(interval)
  }, [coupleMode])

  // Enhanced audio level monitoring with calibrated detection
  const updateAudioLevelWithCalibratedDetection = useCallback(async () => {
    if (!analyserRef.current || !audioContextRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Convert to Float32Array for audio processing
    const floatArray = new Float32Array(dataArray.length)
    for (let i = 0; i < dataArray.length; i++) {
      floatArray[i] = (dataArray[i] - 128) / 128.0
    }

    // Calculate overall audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const normalizedLevel = Math.min(average / 128, 1) as AudioLevel

    if (coupleMode && normalizedLevel > 0.05) { // Only detect when there's actual audio
      try {
        // Use calibrated detection service
        const detectionResult = await calibratedSpeakerDetectionService.detectSpeaker(
          floatArray,
          audioContextRef.current.sampleRate,
          'live_conversation'
        )

        setLastDetectionResult(detectionResult)

        // Handle speaker detection result
        if (detectionResult.speaker && detectionResult.confidence > coupleAudioState.confidenceThreshold) {
          setCoupleAudioState(prev => {
            const newState = { ...prev }
            
            // Update current speaker
            if (detectionResult.speaker && detectionResult.speaker !== prev.currentSpeaker) {
              newState.currentSpeaker = detectionResult.speaker
              onSpeakerChange?.(detectionResult.speaker)
              
              console.log(`🎯 Speaker detected: ${detectionResult.speaker} (${detectionResult.method}, confidence: ${detectionResult.confidence.toFixed(2)}, calibrated: ${detectionResult.isCalibrated})`)
            }

            // Update audio levels per speaker
            if (detectionResult.speaker === 'A') {
              newState.audioLevelA = normalizedLevel
              newState.audioLevelB = prev.audioLevelB * 0.9 // Decay
            } else {
              newState.audioLevelB = normalizedLevel
              newState.audioLevelA = prev.audioLevelA * 0.9 // Decay
            }

            return newState
          })

          // Notify parent of audio levels
          onAudioLevel?.(
            detectionResult.speaker === 'A' ? normalizedLevel : coupleAudioState.audioLevelA,
            detectionResult.speaker === 'B' ? normalizedLevel : coupleAudioState.audioLevelB
          )
        }

      } catch (error) {
        console.warn('Calibrated detection failed:', error)
        // Fallback to basic level detection without speaker assignment
        onAudioLevel?.(normalizedLevel / 2, normalizedLevel / 2)
      }
    } else {
      // No audio or single speaker mode
      onAudioLevel?.(normalizedLevel, 0)
    }

    if (state === 'listening') {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevelWithCalibratedDetection)
    }
  }, [state, coupleMode, coupleAudioState.confidenceThreshold, onAudioLevel, onSpeakerChange])

  // Start recording with calibrated detection
  const startRecording = useCallback(async () => {
    console.log('🎤 Starting enhanced couple recording with calibration support')

    if (disabled) {
      onError('Recording is disabled')
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

      // Setup audio context for real-time detection
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      source.connect(analyserRef.current)

      streamRef.current = stream

      // Setup MediaRecorder
      const supportedMimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType
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
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }

          if (audioBlob.size === 0) {
            onError('No audio recorded. Please try again.')
            onStateChange('idle')
            return
          }

          onStateChange('processing')

          // Transcribe with speaker information
          const currentSpeaker = coupleAudioState.currentSpeaker !== 'silence' 
            ? coupleAudioState.currentSpeaker 
            : 'A' // Default fallback

          const transcriptionText = await transcribeAudio(audioBlob, currentSpeaker)
          
          if (transcriptionText && transcriptionText.trim()) {
            onTranscription(transcriptionText, currentSpeaker)
          } else {
            onError('No speech detected. Please try speaking louder.')
          }
        } catch (error) {
          console.error('Transcription error:', error)
          onError('Failed to process audio. Please check your connection.')
        } finally {
          onStateChange('idle')
          resetAudioLevels()
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
      
      // Start enhanced audio monitoring with calibrated detection
      updateAudioLevelWithCalibratedDetection()

    } catch (error) {
      console.error('Error starting enhanced recording:', error)
      onError('Failed to access microphone')
      onStateChange('idle')
    }
  }, [disabled, coupleMode, coupleAudioState.currentSpeaker, onStateChange, onError, onTranscription, updateAudioLevelWithCalibratedDetection])

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

  // Handle calibration completion
  const handleCalibrationComplete = useCallback(async (result: CalibrationCompletionResult) => {
    try {
      // Update status (VoiceCalibrationService should already have updated the profiles)
      const newStatus = calibratedSpeakerDetectionService.getCalibrationStatus()
      const newStats = calibratedSpeakerDetectionService.getDetectionStats()
      const newAssessment = calibratedSpeakerDetectionService.shouldRecalibrate()
      
      setCalibrationStatus(newStatus)
      setDetectionStats(newStats)
      setRecalibrationAssessment(newAssessment)
      
      console.log('🎯 Calibration completed successfully:', {
        success: result.success,
        sessionDuration: result.sessionDuration,
        recommendation: result.recommendation
      })
      
      // Show success message
      if (result.success) {
        onError(`Calibration complete! ${result.recommendation}`)
      } else {
        onError('Calibration completed with issues. Please try again if accuracy is still low.')
      }
      
    } catch (error) {
      console.error('Failed to update calibration status:', error)
      onError('Calibration completed but failed to update status. Please try again.')
    }
  }, [onError])

  // Manual speaker switching (fallback)
  const switchToSpeaker = useCallback((speaker: Speaker) => {
    setCoupleAudioState(prev => ({
      ...prev,
      currentSpeaker: speaker,
      manualMode: true
    }))
    
    onSpeakerChange?.(speaker)
    console.log(`🎤 Manually switched to speaker: ${speaker}`)
  }, [onSpeakerChange])

  // Reset audio levels
  const resetAudioLevels = useCallback(() => {
    setCoupleAudioState(prev => ({
      ...prev,
      audioLevelA: 0,
      audioLevelB: 0,
      currentSpeaker: 'silence'
    }))
    onAudioLevel?.(0, 0)
  }, [onAudioLevel])

  // Handle button click
  const handleClick = () => {
    if (state === 'requesting-permission' || state === 'processing') {
      return
    }

    if (state === 'idle') {
      startRecording()
    } else if (state === 'listening') {
      stopRecording()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Render calibration status and controls
  const renderCalibrationControls = () => {
    if (!coupleMode || !calibrationStatus) return null

    // Use separate recalibrationAssessment state

    return (
      <div className="flex flex-col items-center space-y-3 mt-4">
        {/* Calibration Status Card */}
        <div className={cn(
          "p-4 rounded-lg border-2 transition-all min-w-[300px]",
          calibrationStatus.isCalibrated 
            ? "border-green-500 bg-green-50" 
            : "border-orange-500 bg-orange-50"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {calibrationStatus.isCalibrated ? (
                <Target size={20} className="text-green-600" />
              ) : (
                <Settings size={20} className="text-orange-600" />
              )}
              <span className="font-medium text-gray-800">
                {calibrationStatus.isCalibrated ? 'Voice Profiles Active' : 'No Voice Calibration'}
              </span>
            </div>
            
            {calibrationStatus.isCalibrated && (
              <div className="text-xs text-gray-600">
                {Math.round((Date.now() - calibrationStatus.lastCalibrationTime) / (1000 * 60 * 60 * 24))} days old
              </div>
            )}
          </div>

          {/* Status Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-600">Profiles:</div>
              <div className="font-medium">
                {(calibrationStatus.speakerAProfile ? 1 : 0) + (calibrationStatus.speakerBProfile ? 1 : 0)}/2
              </div>
            </div>
            <div>
              <div className="text-gray-600">Accuracy:</div>
              <div className="font-medium">
                {detectionStats ? Math.round(detectionStats.avgConfidence * 100) : 0}%
              </div>
            </div>
            <div>
              <div className="text-gray-600">Calibrated Detections:</div>
              <div className="font-medium">
                {detectionStats ? `${detectionStats.calibratedDetections}/${detectionStats.totalDetections}` : '0/0'}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Quality:</div>
              <div className="font-medium">
                {Math.round(calibrationStatus.profileQuality * 100)}%
              </div>
            </div>
          </div>

          {/* Recalibration Recommendation */}
          {recalibrationAssessment && recalibrationAssessment.shouldRecalibrate && (
            <div className={cn(
              "mt-3 p-2 rounded text-xs",
              recalibrationAssessment.urgency === 'high' 
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-yellow-100 text-yellow-800 border border-yellow-200"
            )}>
              <div className="font-medium mb-1">
                {recalibrationAssessment.urgency === 'high' ? '⚠️ Recalibration Required' : '💡 Recalibration Recommended'}
              </div>
              <div>
                {recalibrationAssessment.reason}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCalibrationWizard(true)}
            disabled={state !== 'idle'}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              calibrationStatus.isCalibrated
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-green-500 text-white hover:bg-green-600'
            )}
            aria-label={calibrationStatus.isCalibrated ? "Recalibrate voices" : "Calibrate voices"}
          >
            <Target size={16} className="mr-1" />
            {calibrationStatus.isCalibrated ? 'Recalibrate' : 'Calibrate Voices'}
          </button>

          {/* Manual speaker controls (shown when calibration confidence is low) */}
          {detectionStats && detectionStats.avgConfidence < 0.6 && (
            <>
              <button
                onClick={() => switchToSpeaker('A')}
                disabled={state !== 'idle'}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  coupleAudioState.currentSpeaker === 'A' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                )}
                aria-label="Switch to Partner A"
              >
                <UserCheck size={16} className="mr-1" />
                Partner A
              </button>

              <button
                onClick={() => switchToSpeaker('B')}
                disabled={state !== 'idle'}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  coupleAudioState.currentSpeaker === 'B' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                )}
                aria-label="Switch to Partner B"
              >
                <UserCheck size={16} className="mr-1" />
                Partner B
              </button>
            </>
          )}
        </div>

        {/* Last Detection Info (Development) */}
        {process.env.NODE_ENV === 'development' && lastDetectionResult && (
          <div className="text-xs text-gray-500 font-mono p-2 bg-gray-100 rounded max-w-[400px]">
            <div>Method: {lastDetectionResult.method}</div>
            <div>Confidence: {lastDetectionResult.confidence?.toFixed(3)}</div>
            <div>Calibrated: {lastDetectionResult.isCalibrated ? 'Yes' : 'No'}</div>
            <div>Speaker: {lastDetectionResult.speaker || 'None'}</div>
            {lastDetectionResult.reasoning && (
              <div className="truncate">Reason: {lastDetectionResult.reasoning}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render main recording button
  const renderMainButton = () => {
    const baseClasses = "voice-control-button touch-target focusable"
    
    switch (state) {
      case 'idle':
        return (
          <button
            onClick={handleClick}
            disabled={disabled}
            className={cn(baseClasses, "voice-control-button--primary", className)}
            aria-label={coupleMode ? "Start enhanced couple recording" : "Start voice recording"}
          >
            {coupleMode ? <Users size={24} /> : <Mic size={24} />}
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
            style={{ backgroundColor: 'red', color: 'white' }}
            aria-label="Stop recording"
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

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {renderMainButton()}
      {renderCalibrationControls()}
      
      {/* Calibration Wizard */}
      <VoiceCalibrationWizard
        isOpen={showCalibrationWizard}
        onClose={() => setShowCalibrationWizard(false)}
        onComplete={handleCalibrationComplete}
        onError={onError}
      />

      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite">
        {coupleMode && `Current speaker: ${coupleAudioState.currentSpeaker}`}
        {calibrationStatus?.isCalibrated && 'Voice calibration active'}
        {state === 'idle' && 'Ready to record'}
        {state === 'listening' && 'Recording audio'}
        {state === 'processing' && 'Processing audio'}
      </div>
    </div>
  )
}

// Helper function for MIME type support
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav'
  ]
  return types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm'
}

// Enhanced transcription function with speaker info
async function transcribeAudio(audioBlob: Blob, speaker?: Speaker): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('language', 'en')
  formData.append('enhanced_detection', 'true') // Flag for using calibrated detection
  
  if (speaker) {
    formData.append('speaker', speaker)
  }

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