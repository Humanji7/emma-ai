'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Check, X, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  voiceCalibrationService, 
  type CalibrationSession, 
  type CalibrationSampleResult,
  type CalibrationCompletionResult,
  type CalibrationProgress,
  type CalibrationPromptType,
  type CalibrationStep 
} from '@/services/VoiceCalibrationService'
import type { Speaker } from '@/types'

interface VoiceCalibrationWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (result: CalibrationCompletionResult) => void
  onError: (error: string) => void
}

interface CalibrationPrompt {
  type: CalibrationPromptType
  text: string
  instruction: string
  emotion: string
}

const CALIBRATION_PROMPTS: CalibrationPrompt[] = [
  {
    type: 'neutral',
    text: 'Hello, this is my natural speaking voice for the voice calibration.',
    instruction: 'Speak in a calm, natural tone',
    emotion: '😐 Neutral'
  },
  {
    type: 'happy',
    text: 'I am really excited about using Emma AI to improve our relationship!',
    instruction: 'Speak with enthusiasm and joy',
    emotion: '😊 Happy'
  },
  {
    type: 'frustrated',
    text: 'Sometimes I feel like we are not communicating effectively.',
    instruction: 'Speak with mild frustration (not angry)',
    emotion: '😤 Frustrated'
  },
  {
    type: 'question',
    text: 'How do you think we can better understand each other?',
    instruction: 'Ask this question naturally and curiously',
    emotion: '🤔 Questioning'
  },
  {
    type: 'statement',
    text: 'I believe that good communication is the foundation of any relationship.',
    instruction: 'Make this statement clearly and confidently',
    emotion: '💭 Statement'
  },
  {
    type: 'emotional',
    text: 'I really care about you and want us to work through this together.',
    instruction: 'Speak with genuine emotion and care',
    emotion: '❤️ Emotional'
  }
]

export default function VoiceCalibrationWizard({
  isOpen,
  onClose,
  onComplete,
  onError
}: VoiceCalibrationWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState<CalibrationStep>('instructions')
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('A')
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [session, setSession] = useState<CalibrationSession | null>(null)
  const [progress, setProgress] = useState<CalibrationProgress | null>(null)
  const [lastSampleResult, setLastSampleResult] = useState<CalibrationSampleResult | null>(null)
  const [completionResult, setCompletionResult] = useState<CalibrationCompletionResult | null>(null)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize calibration session
  useEffect(() => {
    if (isOpen && !session) {
      const sessionId = `calibration_${Date.now()}`
      const newSession = voiceCalibrationService.startCalibrationSession(sessionId)
      setSession(newSession)
      console.log('🎙️ Calibration wizard opened')
    }
  }, [isOpen, session])

  // Audio level monitoring
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const normalizedLevel = Math.min(average / 128, 1)
    
    setAudioLevel(normalizedLevel)

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    }
  }, [isRecording])

  // Start recording
  const startRecording = useCallback(async () => {
    if (!session) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      // Setup audio context
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      source.connect(analyserRef.current)

      streamRef.current = stream

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
          await processRecordedSample(audioBlob)
        } catch (error) {
          console.error('Error processing sample:', error)
          onError('Failed to process voice sample')
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)

      // Start audio level monitoring
      updateAudioLevel()

      // Auto-stop after 6 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording()
      }, 6000)

      console.log('🎙️ Started recording calibration sample')

    } catch (error) {
      console.error('Error starting recording:', error)
      onError('Failed to access microphone')
    }
  }, [session, updateAudioLevel, onError])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Cleanup
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      console.log('🎙️ Stopped recording calibration sample')
    }
  }, [isRecording])

  // Process recorded sample
  const processRecordedSample = async (audioBlob: Blob) => {
    if (!session) return

    try {
      // Convert blob to Float32Array
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioContext = new AudioContext()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const audioData = audioBuffer.getChannelData(0)

      const currentPrompt = CALIBRATION_PROMPTS[currentPromptIndex]
      
      // Record sample
      const result = await voiceCalibrationService.recordCalibrationSample(
        session.sessionId,
        audioData,
        audioBuffer.sampleRate,
        currentPrompt.type
      )

      setLastSampleResult(result)

      if (result.success && result.progress) {
        setProgress(result.progress)
        
        // Move to next prompt or speaker
        if (currentPromptIndex < CALIBRATION_PROMPTS.length - 1) {
          setCurrentPromptIndex(prev => prev + 1)
        } else {
          // Switch to next speaker or complete
          if (currentSpeaker === 'A') {
            setCurrentSpeaker('B')
            setCurrentPromptIndex(0)
          } else {
            // Both speakers completed, finish calibration
            await completeCalibration()
          }
        }
      }

      await audioContext.close()

    } catch (error) {
      console.error('Error processing sample:', error)
      onError('Failed to process voice sample')
    }
  }

  // Complete calibration
  const completeCalibration = async () => {
    if (!session) return

    try {
      const result = await voiceCalibrationService.completeCalibration(session.sessionId)
      setCompletionResult(result)
      setCurrentStep('complete')
      
      console.log('🎙️ Calibration completed:', result)
      
      setTimeout(() => {
        onComplete(result)
      }, 2000)

    } catch (error) {
      console.error('Error completing calibration:', error)
      onError('Failed to complete calibration')
    }
  }

  // Retry current sample
  const retrySample = () => {
    setLastSampleResult(null)
    // Keep same prompt and speaker
  }

  // Skip current sample (for testing)
  const skipSample = () => {
    if (currentPromptIndex < CALIBRATION_PROMPTS.length - 1) {
      setCurrentPromptIndex(prev => prev + 1)
    } else if (currentSpeaker === 'A') {
      setCurrentSpeaker('B')
      setCurrentPromptIndex(0)
    }
    setLastSampleResult(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  if (!isOpen) return null

  const currentPrompt = CALIBRATION_PROMPTS[currentPromptIndex]
  const speakerProgress = currentSpeaker === 'A' ? progress?.speakerA : progress?.speakerB

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Voice Calibration</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create personalized voice profiles for accurate speaker detection
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(progress.overallProgress * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.overallProgress * 100}%` }}
                />
              </div>
              
              {/* Speaker Progress */}
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Partner A</p>
                  <div className="flex items-center justify-center space-x-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          i < (progress.speakerA.samplesCollected || 0)
                            ? "bg-blue-500"
                            : "bg-gray-200"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Partner B</p>
                  <div className="flex items-center justify-center space-x-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          i < (progress.speakerB.samplesCollected || 0)
                            ? "bg-orange-500"
                            : "bg-gray-200"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Instructions Step */}
          {currentStep === 'instructions' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mic size={32} className="text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-3">Let's Set Up Your Voices</h3>
                <p className="text-gray-600 mb-4">
                  We&apos;ll record short samples of both partners speaking to create personalized voice profiles. 
                  This process takes about 2-3 minutes and greatly improves speaker detection accuracy.
                </p>
                
                <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                  <strong>How it works:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Each partner records 6 short samples (3-6 seconds each)</li>
                    <li>We'll guide you through different speaking styles</li>
                    <li>The system analyzes voice characteristics and builds profiles</li>
                    <li>Future conversations will have 90%+ accurate speaker detection</li>
                  </ul>
                </div>
              </div>
              
              <button
                onClick={() => setCurrentStep('recording')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <span>Start Calibration</span>
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Recording Step */}
          {currentStep === 'recording' && (
            <div className="space-y-6">
              
              {/* Current Speaker */}
              <div className="text-center">
                <div className={cn(
                  "inline-block px-4 py-2 rounded-full text-sm font-medium",
                  currentSpeaker === 'A' 
                    ? "bg-blue-100 text-blue-800" 
                    : "bg-orange-100 text-orange-800"
                )}>
                  Now Recording: Partner {currentSpeaker}
                </div>
                
                {speakerProgress && (
                  <p className="text-sm text-gray-600 mt-2">
                    Sample {speakerProgress.samplesCollected + 1} of {speakerProgress.samplesNeeded}
                  </p>
                )}
              </div>

              {/* Current Prompt */}
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-2xl mb-2">{currentPrompt.emotion}</div>
                <p className="text-sm text-gray-600 mb-3">{currentPrompt.instruction}</p>
                <blockquote className="text-lg font-medium text-gray-900 italic">
                  "{currentPrompt.text}"
                </blockquote>
              </div>

              {/* Audio Level Visualization */}
              {isRecording && (
                <div className="text-center">
                  <div className="w-32 h-4 bg-gray-200 rounded-full mx-auto overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-150"
                      style={{ width: `${audioLevel * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Recording... {(audioLevel * 100).toFixed(0)}% volume
                  </p>
                </div>
              )}

              {/* Sample Result */}
              {lastSampleResult && (
                <div className={cn(
                  "p-4 rounded-lg border",
                  lastSampleResult.success
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                )}>
                  <div className="flex items-center space-x-2">
                    {lastSampleResult.success ? (
                      <Check size={20} className="text-green-600" />
                    ) : (
                      <X size={20} className="text-red-600" />
                    )}
                    <span className={cn(
                      "font-medium",
                      lastSampleResult.success ? "text-green-800" : "text-red-800"
                    )}>
                      {lastSampleResult.success ? 'Sample Recorded Successfully!' : 'Sample Quality Too Low'}
                    </span>
                  </div>
                  
                  {!lastSampleResult.success && lastSampleResult.recommendation && (
                    <p className="text-sm text-red-700 mt-2">
                      💡 {lastSampleResult.recommendation}
                    </p>
                  )}
                  
                  {lastSampleResult.qualityAnalysis && (
                    <div className="text-xs text-gray-600 mt-2 grid grid-cols-2 gap-2">
                      <div>SNR: {lastSampleResult.qualityAnalysis.snrDb.toFixed(1)}dB</div>
                      <div>Clarity: {(lastSampleResult.qualityAnalysis.clarityScore * 100).toFixed(0)}%</div>
                    </div>
                  )}
                </div>
              )}

              {/* Recording Controls */}
              <div className="flex justify-center space-x-4">
                {!isRecording ? (
                  <>
                    <button
                      onClick={startRecording}
                      className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <Mic size={20} />
                      <span>Start Recording</span>
                    </button>
                    
                    {lastSampleResult && !lastSampleResult.success && (
                      <button
                        onClick={retrySample}
                        className="px-4 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors flex items-center space-x-2"
                      >
                        <RotateCcw size={16} />
                        <span>Retry</span>
                      </button>
                    )}
                    
                    {process.env.NODE_ENV === 'development' && (
                      <button
                        onClick={skipSample}
                        className="px-4 py-3 bg-gray-300 text-gray-700 rounded-full hover:bg-gray-400 transition-colors"
                      >
                        Skip (Dev)
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <MicOff size={20} />
                    <span>Stop Recording</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Completion Step */}
          {currentStep === 'complete' && completionResult && (
            <div className="text-center space-y-6">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto",
                completionResult.success ? "bg-green-100" : "bg-yellow-100"
              )}>
                <Check size={32} className={cn(
                  completionResult.success ? "text-green-600" : "text-yellow-600"
                )} />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-3">
                  {completionResult.success ? 'Calibration Complete!' : 'Partial Calibration'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {completionResult.success 
                    ? 'Voice profiles created successfully. Emma can now accurately detect speakers during conversations.'
                    : 'Some voice samples may need improvement, but basic detection is available.'
                  }
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="font-medium text-blue-800">Partner A</p>
                      <p className="text-xs text-gray-600">
                        {completionResult.results.speakerA.sampleCount} samples
                      </p>
                      <p className="text-xs text-gray-600">
                        {(completionResult.results.speakerA.avgQuality * 100).toFixed(0)}% quality
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-orange-800">Partner B</p>
                      <p className="text-xs text-gray-600">
                        {completionResult.results.speakerB.sampleCount} samples
                      </p>
                      <p className="text-xs text-gray-600">
                        {(completionResult.results.speakerB.avgQuality * 100).toFixed(0)}% quality
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Session Duration: {Math.round(completionResult.sessionDuration / 1000)}s
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                Redirecting to couple session...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}