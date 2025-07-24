'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Square, Users, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VoiceActivityDetectionService } from '@/services/VoiceActivityDetectionService'
import { autoSpeakerDetectionService } from '@/services/AutoSpeakerDetectionService'
import { hybridSpeakerDetectionService } from '@/services/HybridSpeakerDetectionService'
import { calibratedSpeakerDetectionService } from '@/services/CalibratedSpeakerDetectionService'
import VoiceCalibrationWizard from './VoiceCalibrationWizard'
import type { CalibrationCompletionResult } from '@/services/VoiceCalibrationService'
import type { 
  VoiceRecorderState, 
  AudioLevel, 
  Speaker, 
  CoupleAudioState,
  SpeakerDetectionMode,
  VADResult
} from '@/types'

interface CoupleVoiceRecorderProps {
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
  useAutoDetection?: boolean
  useAdvancedDetection?: boolean
  useCalibratedDetection?: boolean
}

export default function CoupleVoiceRecorder({
  state,
  onStateChange,
  onTranscription,
  onError,
  onAudioLevel,
  onSpeakerChange,
  disabled = false,
  className,
  coupleMode = false,
  detectionMode = 'hybrid',
  pauseThreshold = 400,
  useAutoDetection = false,
  useAdvancedDetection = false,
  useCalibratedDetection = false
}: CoupleVoiceRecorderProps) {
  
  // Couple-specific state
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

  const [isCalibrated, setIsCalibrated] = useState(false)
  const [calibrationStep, setCalibrationStep] = useState<'none' | 'speakerA' | 'speakerB' | 'complete'>('none')
  const [autoDetectionStats, setAutoDetectionStats] = useState<{
    isLearning: boolean
    confidence: number
    sampleCount: number
    lastDetection?: string
    hybridStats?: any
  }>({
    isLearning: true,
    confidence: 0,
    sampleCount: 0
  })
  
  // Calibration state
  const [showCalibrationWizard, setShowCalibrationWizard] = useState(false)
  const [calibrationStatus, setCalibrationStatus] = useState<any>(null)
  
  // Refs for audio processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const vadServiceRef = useRef<VoiceActivityDetectionService | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Initialize services
  useEffect(() => {
    if (coupleMode && !vadServiceRef.current) {
      vadServiceRef.current = new VoiceActivityDetectionService(pauseThreshold, 0.6)
      console.log('🎤 Couple VAD service initialized')
    }
    
    // Initialize detection services if enabled
    if (useAutoDetection && coupleMode) {
      autoSpeakerDetectionService.initialize()
      console.log('🎯 Auto Speaker Detection enabled')
    }
    
    if (useAdvancedDetection && coupleMode) {
      hybridSpeakerDetectionService.initialize()
      console.log('🚀 Advanced Hybrid Detection enabled')
    }
    
    if (useCalibratedDetection && coupleMode) {
      calibratedSpeakerDetectionService.initialize()
      console.log('🔊 Calibrated Detection enabled')
      
      // Check calibration status
      const status = calibratedSpeakerDetectionService.getCalibrationStatus()
      setCalibrationStatus(status)
      setIsCalibrated(status.isCalibrated)
    }
    
    return () => {
      vadServiceRef.current?.cleanup()
      if (useAutoDetection) {
        autoSpeakerDetectionService.cleanup()
      }
      if (useAdvancedDetection) {
        hybridSpeakerDetectionService.cleanup()
      }
      if (useCalibratedDetection) {
        calibratedSpeakerDetectionService.cleanup()
      }
    }
  }, [coupleMode, pauseThreshold, useAutoDetection, useAdvancedDetection, useCalibratedDetection])

  // Update detection mode
  useEffect(() => {
    setCoupleAudioState(prev => ({
      ...prev,
      detectionMode,
      pauseThreshold
    }))
  }, [detectionMode, pauseThreshold])

  // Enhanced audio level monitoring with speaker detection
  const updateAudioLevelWithVAD = useCallback(() => {
    if (!analyserRef.current) return

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

    if (coupleMode) {
      let detectedSpeaker: Speaker | undefined
      let confidence = 0
      let detectionMethod = 'none'

      if (useCalibratedDetection) {
        // Use Calibrated Detection System (highest priority)
        try {
          calibratedSpeakerDetectionService.detectSpeaker(
            floatArray,
            audioContextRef.current?.sampleRate || 44100,
            'live_conversation'
          ).then(calibratedResult => {
            detectedSpeaker = calibratedResult.speaker
            confidence = calibratedResult.confidence
            detectionMethod = calibratedResult.method
            
            // Update calibration status
            const status = calibratedSpeakerDetectionService.getCalibrationStatus()
            setCalibrationStatus(status)
            
            // Update stats
            setAutoDetectionStats(prev => ({
              ...prev,
              confidence: calibratedResult.confidence,
              lastDetection: calibratedResult.reasoning,
              sampleCount: calibratedResult.timestamp
            }))
            
            // Handle speaker detection result
            handleSpeakerDetectionResult(detectedSpeaker, confidence, detectionMethod, floatArray, normalizedLevel)
          }).catch(error => {
            console.warn('🔊 Calibrated detection failed, falling back to hybrid:', error)
            // Fallback to hybrid detection
            fallbackToHybridDetection(floatArray, normalizedLevel)
          })
        } catch (error) {
          console.warn('🔊 Calibrated detection initialization failed:', error)
          fallbackToHybridDetection(floatArray, normalizedLevel)
        }
        
      } else if (useAdvancedDetection) {
        // Use Advanced Hybrid Detection System
        try {
          hybridSpeakerDetectionService.detectSpeaker(
            floatArray,
            audioContextRef.current?.sampleRate || 44100,
            'live_conversation'
          ).then(hybridResult => {
            detectedSpeaker = hybridResult.speaker
            confidence = hybridResult.confidence
            detectionMethod = hybridResult.method
            
            // Update hybrid stats
            const hybridStats = hybridSpeakerDetectionService.getDetectionStats()
            setAutoDetectionStats(prev => ({
              ...prev,
              confidence: hybridResult.confidence,
              lastDetection: hybridResult.reasoning,
              sampleCount: hybridStats.totalDetections,
              hybridStats: hybridStats
            }))
            
            // Check if system is calibrated
            if (hybridStats.totalDetections >= 5 && !isCalibrated) {
              setIsCalibrated(true)
              console.log('🚀 Hybrid detection system calibrated!')
            }

            // Handle speaker detection result
            handleSpeakerDetectionResult(detectedSpeaker, confidence, detectionMethod, floatArray, normalizedLevel)
          }).catch(error => {
            console.warn('🚀 Hybrid detection failed, falling back:', error)
            // Fallback to auto detection
            if (useAutoDetection) {
              const autoResult = autoSpeakerDetectionService.detectSpeakerAuto(floatArray, audioContextRef.current?.sampleRate || 44100)
              handleSpeakerDetectionResult(autoResult.speaker, autoResult.confidence, autoResult.method + '_fallback', floatArray, normalizedLevel)
            }
          })
        } catch (error) {
          console.warn('🚀 Hybrid detection initialization failed:', error)
        }
        
      } else if (useAutoDetection) {
        // Use AutoSpeakerDetectionService
        const autoResult = autoSpeakerDetectionService.detectSpeakerAuto(
          floatArray,
          audioContextRef.current?.sampleRate || 44100
        )
        
        // Update auto detection stats
        setAutoDetectionStats(prev => ({
          ...prev,
          confidence: autoResult.confidence,
          lastDetection: autoResult.reasoning,
          sampleCount: autoSpeakerDetectionService.getDetectionStats().totalTurns
        }))
        
        // Check if learning is complete
        const calibrationStatus = autoSpeakerDetectionService.getCalibrationStatus()
        if (calibrationStatus.isCalibrated && !isCalibrated) {
          setIsCalibrated(true)
          console.log('🎯 Auto detection calibration complete!')
        }

        handleSpeakerDetectionResult(autoResult.speaker, autoResult.confidence, autoResult.method, floatArray, normalizedLevel)

      } else if (vadServiceRef.current) {
        // Use traditional VAD service
        const vadResult: VADResult = vadServiceRef.current.detectSpeaker(
          floatArray, 
          coupleAudioState.detectionMode
        )
        
        if (vadResult.isSpeech && vadResult.speaker) {
          handleSpeakerDetectionResult(vadResult.speaker, vadResult.confidence, 'vad', floatArray, normalizedLevel)
        }
      }
    } else {
      // Single speaker mode - use original logic
      onAudioLevel?.(normalizedLevel, 0)
    }

    if (state === 'listening') {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevelWithVAD)
    }
  }, [state, coupleMode, useAutoDetection, coupleAudioState.detectionMode, coupleAudioState.confidenceThreshold, isCalibrated, onAudioLevel, onSpeakerChange])

  // Helper function to handle speaker detection results consistently
  const handleSpeakerDetectionResult = useCallback((
    detectedSpeaker: Speaker | undefined,
    confidence: number,
    detectionMethod: string,
    floatArray: Float32Array,
    normalizedLevel: AudioLevel
  ) => {
    // Update speaker state if detection is confident
    if (detectedSpeaker && confidence > coupleAudioState.confidenceThreshold) {
      setCoupleAudioState(prev => {
        const newState = { ...prev }
        
        // Update current speaker
        if (detectedSpeaker !== prev.currentSpeaker) {
          newState.currentSpeaker = detectedSpeaker
          
          // Update VAD service with current speaker (for fallback compatibility)
          if (vadServiceRef.current) {
            vadServiceRef.current.setActiveSpeaker(detectedSpeaker)
          }
          
          // Notify parent component
          onSpeakerChange?.(detectedSpeaker)
          console.log(`🎯 Speaker auto-detected: ${detectedSpeaker} (${detectionMethod}, confidence: ${confidence.toFixed(2)})`)
        }

        // Update audio levels per speaker
        if (detectedSpeaker === 'A') {
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
        detectedSpeaker === 'A' ? normalizedLevel : coupleAudioState.audioLevelA,
        detectedSpeaker === 'B' ? normalizedLevel : coupleAudioState.audioLevelB
      )
    }
  }, [coupleAudioState.confidenceThreshold, onAudioLevel, onSpeakerChange])

  // Fallback to hybrid detection
  const fallbackToHybridDetection = useCallback((floatArray: Float32Array, normalizedLevel: AudioLevel) => {
    if (useAdvancedDetection) {
      hybridSpeakerDetectionService.detectSpeaker(
        floatArray,
        audioContextRef.current?.sampleRate || 44100,
        'live_conversation'
      ).then(hybridResult => {
        handleSpeakerDetectionResult(hybridResult.speaker, hybridResult.confidence, hybridResult.method + '_fallback', floatArray, normalizedLevel)
      }).catch(error => {
        console.warn('🚀 Hybrid fallback also failed:', error)
      })
    } else if (useAutoDetection) {
      const autoResult = autoSpeakerDetectionService.detectSpeakerAuto(floatArray, audioContextRef.current?.sampleRate || 44100)
      handleSpeakerDetectionResult(autoResult.speaker, autoResult.confidence, autoResult.method + '_fallback', floatArray, normalizedLevel)
    }
  }, [useAdvancedDetection, useAutoDetection])

  // Handle calibration completion
  const handleCalibrationComplete = useCallback((result: CalibrationCompletionResult) => {
    console.log('🔊 Calibration completed:', result)
    setShowCalibrationWizard(false)
    
    if (result.success) {
      // Update calibration status
      const status = calibratedSpeakerDetectionService.getCalibrationStatus()
      setCalibrationStatus(status)
      setIsCalibrated(status.isCalibrated)
      
      console.log('🎉 Voice profiles created successfully!')
    } else {
      console.warn('⚠️ Calibration completed with issues')
    }
  }, [])

  // Handle calibration error
  const handleCalibrationError = useCallback((error: string) => {
    console.error('❌ Calibration error:', error)
    // Could show user notification here
  }, [])

  // Start recording with couple mode support
  const startRecording = useCallback(async () => {
    console.log('🎤 Starting couple recording:', { coupleMode, detectionMode, isCalibrated })

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

      // Setup audio context for VAD
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048 // Higher resolution for better VAD
      source.connect(analyserRef.current)

      // Initialize VAD service with audio context
      if (coupleMode && vadServiceRef.current) {
        await vadServiceRef.current.initialize(audioContextRef.current, analyserRef.current)
      }

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
            : undefined
          const transcriptionText = await transcribeAudio(audioBlob, currentSpeaker)
          
          if (transcriptionText && transcriptionText.trim()) {
            if (coupleMode && coupleAudioState.currentSpeaker !== 'silence') {
              onTranscription(transcriptionText, coupleAudioState.currentSpeaker)
            } else {
              // Fallback for single mode or unknown speaker
              onTranscription(transcriptionText, 'A') // Default to A
            }
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
      
      // Start enhanced audio monitoring
      updateAudioLevelWithVAD()

    } catch (error) {
      console.error('Error starting couple recording:', error)
      onError('Failed to access microphone')
      onStateChange('idle')
    }
  }, [disabled, coupleMode, detectionMode, isCalibrated, coupleAudioState.currentSpeaker, onStateChange, onError, onTranscription, updateAudioLevelWithVAD])

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

  // Manual speaker switching
  const switchToSpeaker = useCallback((speaker: Speaker) => {
    setCoupleAudioState(prev => ({
      ...prev,
      currentSpeaker: speaker,
      manualMode: true
    }))
    
    // Update VAD service with current speaker
    if (vadServiceRef.current) {
      vadServiceRef.current.setActiveSpeaker(speaker)
    }
    
    onSpeakerChange?.(speaker)
    console.log(`🎤 Manually switched to speaker: ${speaker}`)
  }, [onSpeakerChange])

  // Speaker calibration
  const startCalibration = useCallback(async () => {
    if (!vadServiceRef.current) {
      onError('VAD service not available')
      return
    }

    setCalibrationStep('speakerA')
    // In a real implementation, this would guide users through calibration
    console.log('🎤 Starting speaker calibration...')
  }, [onError])

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

  // Render couple mode controls
  const renderCoupleControls = () => {
    if (!coupleMode) return null

    return (
      <div className="flex flex-col items-center space-y-3 mt-4">
        {/* Calibrated detection status (highest priority) */}
        {useCalibratedDetection && (
          <div className="flex flex-col space-y-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  isCalibrated ? "bg-green-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-sm font-medium text-green-900">
                  {isCalibrated ? "🔊 Calibrated Detection Active" : "🔊 Calibration Required"}
                </span>
              </div>
              {!isCalibrated && (
                <button
                  onClick={() => setShowCalibrationWizard(true)}
                  disabled={state !== 'idle'}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-700 transition-colors"
                >
                  Calibrate
                </button>
              )}
            </div>
            
            {calibrationStatus && (
              <div className="text-xs text-green-700 grid grid-cols-3 gap-2">
                <div>Profile Quality: {Math.round(calibrationStatus.profileQuality * 100)}%</div>
                <div>Confidence: {Math.round(autoDetectionStats.confidence * 100)}%</div>
                <div>Last: {new Date(calibrationStatus.lastCalibrationTime).toLocaleTimeString()}</div>
              </div>
            )}
            
            {calibrationStatus?.needsRecalibration && (
              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                ⚠️ Recalibration recommended for better accuracy
              </div>
            )}
          </div>
        )}

        {/* Advanced detection status (when enabled) */}
        {useAdvancedDetection && !useCalibratedDetection && (
          <div className="flex flex-col space-y-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isCalibrated ? "bg-blue-500 animate-pulse" : "bg-orange-500 animate-spin"
              )} />
              <span className="text-sm font-medium text-blue-900">
                {isCalibrated ? "🚀 Hybrid AI Detection Active" : "🚀 AI Learning Voices..."}
              </span>
            </div>
            <div className="text-xs text-blue-700 grid grid-cols-2 gap-2">
              <div>Confidence: {Math.round(autoDetectionStats.confidence * 100)}%</div>
              <div>Samples: {autoDetectionStats.sampleCount}</div>
              {autoDetectionStats.hybridStats && (
                <>
                  <div>Accuracy: {Math.round(autoDetectionStats.hybridStats.overallAccuracy * 100)}%</div>
                  <div>Methods: {autoDetectionStats.hybridStats.methodStats?.size || 0}</div>
                </>
              )}
            </div>
            {autoDetectionStats.lastDetection && (
              <div className="text-xs text-blue-600 italic">
                {autoDetectionStats.lastDetection}
              </div>
            )}
          </div>
        )}
        
        {/* Auto detection status (when enabled without advanced) */}
        {useAutoDetection && !useAdvancedDetection && !useCalibratedDetection && (
          <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isCalibrated ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-spin"
              )} />
              <span className="text-sm font-medium text-purple-900">
                {isCalibrated ? "🎯 Auto Detection Active" : "🎯 Learning Voices..."}
              </span>
            </div>
            <div className="text-xs text-purple-700">
              Confidence: {Math.round(autoDetectionStats.confidence * 100)}% 
              {autoDetectionStats.sampleCount > 0 && ` | ${autoDetectionStats.sampleCount} samples`}
            </div>
          </div>
        )}

        {/* Manual speaker buttons (hidden in auto mode unless fallback needed) */}
        {((!useAutoDetection && !useAdvancedDetection && !useCalibratedDetection) || 
          ((useAutoDetection || useAdvancedDetection || useCalibratedDetection) && autoDetectionStats.confidence < 0.4)) && (
          <div className="flex items-center space-x-2">
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

            {/* Show manual fallback message in auto mode */}
            {(useAutoDetection || useAdvancedDetection || useCalibratedDetection) && autoDetectionStats.confidence < 0.4 && (
              <span className="text-xs text-amber-600 ml-2">
                Low confidence - manual fallback available
              </span>
            )}
          </div>
        )}

        {/* Traditional calibration button (non-auto mode) */}
        {!useAutoDetection && !useAdvancedDetection && !isCalibrated && (
          <button
            onClick={startCalibration}
            disabled={state !== 'idle'}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            aria-label="Calibrate voices"
          >
            <Users size={16} className="mr-1" />
            Calibrate
          </button>
        )}
      </div>
    )
  }

  // Render main recording button (reuse existing logic with couple enhancements)
  const renderMainButton = () => {
    const baseClasses = "voice-control-button touch-target focusable"
    
    switch (state) {
      case 'idle':
        return (
          <button
            onClick={handleClick}
            disabled={disabled}
            className={cn(baseClasses, "voice-control-button--primary", className)}
            aria-label={coupleMode ? "Start couple recording" : "Start voice recording"}
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
      {renderCoupleControls()}
      
      {/* Voice Calibration Wizard */}
      {useCalibratedDetection && (
        <VoiceCalibrationWizard
          isOpen={showCalibrationWizard}
          onClose={() => setShowCalibrationWizard(false)}
          onComplete={handleCalibrationComplete}
          onError={handleCalibrationError}
        />
      )}
      
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && coupleMode && (
        <div className="mt-2 text-xs text-gray-500 font-mono space-y-1">
          <div>
            Speaker: {coupleAudioState.currentSpeaker} | 
            Mode: {useCalibratedDetection ? 'calibrated' : useAdvancedDetection ? 'hybrid-ai' : useAutoDetection ? 'auto' : coupleAudioState.detectionMode} |
            A: {coupleAudioState.audioLevelA.toFixed(2)} |
            B: {coupleAudioState.audioLevelB.toFixed(2)}
          </div>
          {useAutoDetection && (
            <div className="text-purple-600">
              Auto: {autoDetectionStats.confidence.toFixed(2)} confidence | 
              {autoDetectionStats.sampleCount} samples |
              {autoDetectionStats.lastDetection}
            </div>
          )}
          {useCalibratedDetection && calibrationStatus && (
            <div className="text-green-600">
              Calibrated: {Math.round(calibrationStatus.profileQuality * 100)}% quality | 
              {isCalibrated ? 'Active' : 'Needs calibration'} |
              Last: {new Date(calibrationStatus.lastCalibrationTime).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite">
        {coupleMode && `Current speaker: ${coupleAudioState.currentSpeaker}`}
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