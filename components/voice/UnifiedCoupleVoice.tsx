'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { coupleVoiceManager, type CoupleProfile, type VoiceManagerState } from '@/services/CoupleVoiceManager'
import { ElevenLabsTTSService } from '@/services/ElevenLabsTTSService'
import type { Speaker, CoupleVoiceMessage } from '@/types'

type CalibrationStep = {
  id: string
  partnerId: Speaker
  sampleType: 'neutral' | 'happy' | 'frustrated' | 'question'
  prompt: string
  emotion: string
}

type UnifiedVoiceMode = 
  | 'setup'           // Initial setup
  | 'calibration'     // Quick or Advanced calibration
  | 'conversation'    // Active conversation
  | 'settings'        // Profile management

interface UnifiedCoupleVoiceProps {
  onMessage?: (message: CoupleVoiceMessage) => void
  onError?: (error: string) => void
  onStateChange?: (state: VoiceManagerState) => void
  className?: string
}

export default function UnifiedCoupleVoice({
  onMessage,
  onError,
  onStateChange,
  className = ''
}: UnifiedCoupleVoiceProps) {
  // Core state
  const [mode, setMode] = useState<UnifiedVoiceMode>('setup')
  const [voiceState, setVoiceState] = useState<VoiceManagerState>()
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string>()

  // Calibration state
  const [calibrationType, setCalibrationType] = useState<'quick' | 'advanced'>('quick')
  const [calibrationSession, setCalibrationSession] = useState<string>()
  const [calibrationStep, setCalibrationStep] = useState(0)
  const [calibrationSteps, setCalibrationSteps] = useState<CalibrationStep[]>([])
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [isRecordingCalibration, setIsRecordingCalibration] = useState(false)

  // Profile management
  const [availableProfiles, setAvailableProfiles] = useState<CoupleProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<CoupleProfile>()
  const [profileName, setProfileName] = useState('')

  // Conversation state
  const [messages, setMessages] = useState<CoupleVoiceMessage[]>([])
  const [isListening, setIsListening] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('A')

  // TTS service
  const ttsService = useRef<ElevenLabsTTSService>()

  // Initialize voice manager and TTS
  useEffect(() => {
    let mounted = true
    let cleanupInterval: (() => void) | undefined
    
    const initialize = async () => {
      try {
        if (!mounted) return
        
        await coupleVoiceManager.initialize()
        
        // Initialize TTS service (API key now secure on backend)
        ttsService.current = new ElevenLabsTTSService({
          // No API key needed - handled by secure backend endpoint
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
        })
        await ttsService.current.initialize()
        
        // Load existing profiles
        const profiles = await coupleVoiceManager.getAvailableProfiles()
        setAvailableProfiles(profiles)
        
        // Auto-select most recent profile if available
        if (profiles.length > 0) {
          setSelectedProfile(profiles[0])
          await coupleVoiceManager.switchProfile(profiles[0].id)
          setMode('conversation')
        }
        
        setIsInitialized(true)
        
        // Set up state monitoring with change detection
        let lastStateJSON = ''
        const updateState = () => {
          if (!mounted) return
          
          const state = coupleVoiceManager.getState()
          const stateJSON = JSON.stringify(state)
          
          // Only update if state actually changed
          if (stateJSON !== lastStateJSON) {
            lastStateJSON = stateJSON
            setVoiceState(state)
            onStateChange?.(state)
            setCurrentSpeaker(state.currentSpeaker === 'silence' ? 'A' : state.currentSpeaker)
          }
        }
        
        const interval = setInterval(updateState, 300) // Reduced frequency: 300ms
        cleanupInterval = () => clearInterval(interval)
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Initialization failed'
        setError(errorMsg)
        onError?.(errorMsg)
      }
    }

    initialize()
    
    return () => {
      mounted = false
      if (cleanupInterval) {
        cleanupInterval()
      }
    }
  }, [onStateChange, onError])

  // Generate calibration steps based on type
  const generateCalibrationSteps = useCallback((type: 'quick' | 'advanced'): CalibrationStep[] => {
    const quickSteps: CalibrationStep[] = [
      { id: 'A1', partnerId: 'A', sampleType: 'neutral', prompt: 'Привет, меня зовут [имя], это мой обычный голос.', emotion: '😐 Нейтрально' },
      { id: 'A2', partnerId: 'A', sampleType: 'happy', prompt: 'Я очень рад использовать Emma AI для наших отношений!', emotion: '😊 Радостно' },
      { id: 'A3', partnerId: 'A', sampleType: 'question', prompt: 'Как дела? Что ты думаешь об этом?', emotion: '❓ Вопрос' },
      { id: 'B1', partnerId: 'B', sampleType: 'neutral', prompt: 'Привет, меня зовут [имя], это мой обычный голос.', emotion: '😐 Нейтрально' },
      { id: 'B2', partnerId: 'B', sampleType: 'happy', prompt: 'Я очень рад использовать Emma AI для наших отношений!', emotion: '😊 Радостно' },
      { id: 'B3', partnerId: 'B', sampleType: 'question', prompt: 'Как дела? Что ты думаешь об этом?', emotion: '❓ Вопрос' }
    ]

    const advancedSteps: CalibrationStep[] = [
      ...quickSteps,
      { id: 'A4', partnerId: 'A', sampleType: 'frustrated', prompt: 'Меня немного расстраивает эта ситуация.', emotion: '😤 Расстроен' },
      { id: 'A5', partnerId: 'A', sampleType: 'neutral', prompt: 'Давайте обсудим это спокойно и найдем решение.', emotion: '😐 Спокойно' },
      { id: 'A6', partnerId: 'A', sampleType: 'happy', prompt: 'Мне нравится, как мы работаем вместе!', emotion: '😊 Довольно' },
      { id: 'A7', partnerId: 'A', sampleType: 'question', prompt: 'Что если попробуем другой подход к этой проблеме?', emotion: '🤔 Размышление' },
      { id: 'A8', partnerId: 'A', sampleType: 'neutral', prompt: 'Я понимаю твою точку зрения и хочу найти компромисс.', emotion: '🤝 Понимание' },
      { id: 'B4', partnerId: 'B', sampleType: 'frustrated', prompt: 'Меня немного расстраивает эта ситуация.', emotion: '😤 Расстроен' },
      { id: 'B5', partnerId: 'B', sampleType: 'neutral', prompt: 'Давайте обсудим это спокойно и найдем решение.', emotion: '😐 Спокойно' },
      { id: 'B6', partnerId: 'B', sampleType: 'happy', prompt: 'Мне нравится, как мы работаем вместе!', emotion: '😊 Довольно' },
      { id: 'B7', partnerId: 'B', sampleType: 'question', prompt: 'Что если попробуем другой подход к этой проблеме?', emotion: '🤔 Размышление' },
      { id: 'B8', partnerId: 'B', sampleType: 'neutral', prompt: 'Я понимаю твою точку зрения и хочу найти компромисс.', emotion: '🤝 Понимание' }
    ]

    return type === 'quick' ? quickSteps : advancedSteps
  }, [])

  // Start calibration
  const startCalibration = async (type: 'quick' | 'advanced') => {
    try {
      setCalibrationType(type)
      const steps = generateCalibrationSteps(type)
      setCalibrationSteps(steps)
      setCalibrationStep(0)
      setCalibrationProgress(0)
      
      const session = await coupleVoiceManager.startQuickCalibration()
      setCalibrationSession(session.sessionId)
      setMode('calibration')
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start calibration'
      setError(errorMsg)
    }
  }

  // Record calibration sample with actual microphone recording
  const recordCalibrationSample = async () => {
    if (!calibrationSession || !calibrationSteps[calibrationStep]) return

    try {
      setIsRecordingCalibration(true)
      const step = calibrationSteps[calibrationStep]
      
      console.log(`🎤 Starting voice recording for ${step.partnerId}: ${step.prompt}`)
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      })

      // Create audio context for processing
      const audioContext = new AudioContext({ sampleRate: 44100 })
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      // Record for 3 seconds
      const recordingDuration = 3000 // 3 seconds
      const sampleRate = audioContext.sampleRate
      const bufferLength = Math.floor(sampleRate * recordingDuration / 1000)
      const audioBuffer = new Float32Array(bufferLength)
      
      let bufferIndex = 0
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      const recordAudio = (): void => {
        if (bufferIndex >= bufferLength) {
          // Recording complete
          stream.getTracks().forEach(track => track.stop())
          audioContext.close()
          processRecording()
          return
        }
        
        analyser.getByteTimeDomainData(dataArray)
        
        // Convert to float32 and store
        for (let i = 0; i < dataArray.length && bufferIndex < bufferLength; i++, bufferIndex++) {
          audioBuffer[bufferIndex] = (dataArray[i] - 128) / 128.0
        }
        
        requestAnimationFrame(recordAudio)
      }
      
      const processRecording = async () => {
        try {
          console.log(`🎤 Recorded ${audioBuffer.length} samples at ${sampleRate}Hz`)
          
          const result = await coupleVoiceManager.recordCalibrationSample(
            calibrationSession,
            step.partnerId,
            step.sampleType,
            audioBuffer,
            sampleRate
          )

          if (result.success) {
            setCalibrationProgress(result.progress)
            console.log(`✅ Sample recorded with quality: ${result.quality.toFixed(2)}`)
            
            if (calibrationStep < calibrationSteps.length - 1) {
              setCalibrationStep(prev => prev + 1)
            } else {
              // Calibration complete
              await completeCalibration()
            }
          } else {
            setError(result.nextStep || 'Recording quality too low')
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Processing failed'
          setError(errorMsg)
        } finally {
          setIsRecordingCalibration(false)
        }
      }
      
      // Start recording
      recordAudio()
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Microphone access failed'
      setError(errorMsg)
      setIsRecordingCalibration(false)
      
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Микрофон заблокирован. Разрешите доступ к микрофону в настройках браузера.')
      }
    }
  }

  // Complete calibration
  const completeCalibration = async () => {
    if (!calibrationSession) {
      setError('Ошибка: сессия калибровки не найдена')
      return
    }

    if (!profileName.trim()) {
      setError('Ошибка: не указано название профиля. Пожалуйста, начните калибровку заново.')
      console.error('❌ Profile name is empty during calibration completion')
      console.log('📊 Debug info:', { 
        calibrationSession, 
        profileName: `"${profileName}"`, 
        profileNameLength: profileName.length,
        trimmedLength: profileName.trim().length 
      })
      return
    }

    try {
      console.log(`💾 Completing calibration with profile name: "${profileName.trim()}"`)
      
      const result = await coupleVoiceManager.completeCalibration(
        calibrationSession,
        profileName.trim()
      )

      console.log('📊 Calibration completion result:', result)

      if (result.success) {
        console.log('✅ Profile saved successfully:', result.profile.name)
        setSelectedProfile(result.profile)
        setMode('conversation')
        
        // Refresh profiles list
        const profiles = await coupleVoiceManager.getAvailableProfiles()
        setAvailableProfiles(profiles)
        
        // Reset calibration state
        setCalibrationSession(undefined)
        setCalibrationStep(0)
        setCalibrationSteps([])
        setProfileName('')
      } else {
        setError('Ошибка сохранения профиля. Попробуйте еще раз.')
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Calibration completion failed'
      console.error('❌ Calibration completion error:', err)
      setError(`Ошибка завершения калибровки: ${errorMsg}`)
    }
  }

  // Start conversation
  const startConversation = async () => {
    try {
      await coupleVoiceManager.startConversation()
      setIsListening(true)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start conversation'
      setError(errorMsg)
    }
  }

  // Stop conversation
  const stopConversation = async () => {
    try {
      await coupleVoiceManager.stopConversation()
      setIsListening(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop conversation'
      setError(errorMsg)
    }
  }

  // Handle new transcribed message
  const handleNewMessage = useCallback((text: string, speaker: Speaker) => {
    const message: CoupleVoiceMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date(),
      speaker,
      conflictLevel: 0,
      emotionalTone: 'calm'
    }

    setMessages(prev => [...prev, message])
    onMessage?.(message)
  }, [onMessage])

  // Get accuracy color
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return 'text-green-600'
    if (accuracy >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Render setup mode
  if (mode === 'setup') {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>🎤 Настройка голосового интерфейса</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isInitialized ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p>Инициализация голосового движка...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <p>❌ {error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  className="mt-4"
                >
                  Перезагрузить
                </Button>
              </div>
            ) : (
              <>
                {availableProfiles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Существующие профили</h3>
                    <div className="space-y-2">
                      {availableProfiles.map(profile => (
                        <div 
                          key={profile.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{profile.name}</p>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Badge variant="outline">
                                Точность: {Math.round(profile.accuracy * 100)}%
                              </Badge>
                              <span>
                                {profile.partnerA.advanced ? 'Продвинутая' : 'Быстрая'} калибровка
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={async () => {
                              setSelectedProfile(profile)
                              await coupleVoiceManager.switchProfile(profile.id)
                              setMode('conversation')
                            }}
                            variant="primary"
                            size="sm"
                          >
                            Использовать
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Создать новый профиль</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Название профиля пары
                      </label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Например: Александр и Мария"
                        className="w-full p-2 border rounded-md"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-2 border-green-200 hover:border-green-400 cursor-pointer transition-colors">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl mb-2">⚡</div>
                            <h4 className="font-semibold">Быстрая калибровка</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              30 секунд на каждого партнера<br/>
                              Точность: ~70%
                            </p>
                            <Button
                              onClick={() => startCalibration('quick')}
                              disabled={!profileName.trim()}
                              variant="primary"
                              size="sm"
                              className="w-full"
                            >
                              Начать (1 мин)
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-blue-200 hover:border-blue-400 cursor-pointer transition-colors">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl mb-2">🎯</div>
                            <h4 className="font-semibold">Продвинутая калибровка</h4>
                            <p className="text-sm text-gray-600 mb-3">
                              2-3 минуты на каждого партнера<br/>
                              Точность: ~85%+
                            </p>
                            <Button
                              onClick={() => startCalibration('advanced')}
                              disabled={!profileName.trim()}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              Начать (5 мин)
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render calibration mode
  if (mode === 'calibration') {
    const currentStep = calibrationSteps[calibrationStep]
    const isPartnerA = currentStep?.partnerId === 'A'
    
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>
              🎤 Калибровка голоса: {calibrationType === 'quick' ? 'Быстрая' : 'Продвинутая'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Прогресс</span>
                <span>{calibrationStep + 1} из {calibrationSteps.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${(calibrationStep / calibrationSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {currentStep && (
              <div className={`p-4 rounded-lg border-2 ${
                isPartnerA ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'
              }`}>
                <div className="text-center mb-4">
                  <Badge variant="outline" className="mb-2">
                    Партнер {currentStep.partnerId} • {currentStep.emotion}
                  </Badge>
                  <h3 className="text-lg font-semibold">
                    {isPartnerA ? '👤 Первый партнер' : '👤 Второй партнер'}
                  </h3>
                </div>

                <div className="bg-white p-4 rounded-lg mb-4">
                  <p className="text-center text-lg">
                    "{currentStep.prompt}"
                  </p>
                </div>

                <div className="text-center">
                  {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                      ❌ {error}
                      <button 
                        onClick={() => setError(undefined)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  <Button
                    onClick={recordCalibrationSample}
                    disabled={isRecordingCalibration}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    {isRecordingCalibration ? (
                      <>
                        <div className="animate-pulse mr-2">🔴</div>
                        Запись... (3 сек)
                        <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </>
                    ) : (
                      <>
                        🎤 Записать образец (3 сек)
                      </>
                    )}
                  </Button>
                  
                  <p className="text-sm text-gray-600 mt-2">
                    Нажмите кнопку и четко произнесите фразу выше
                  </p>
                  
                  {isRecordingCalibration && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-blue-700 text-sm font-medium">Слушаю... говорите сейчас</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-center">
              <Button
                onClick={() => setMode('setup')}
                variant="outline"
                size="sm"
              >
                ← Отменить калибровку
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render conversation mode
  if (mode === 'conversation') {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Profile Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{selectedProfile?.name}</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <Badge 
                    variant="outline" 
                    className={getAccuracyColor(selectedProfile?.accuracy || 0)}
                  >
                    Точность: {Math.round((selectedProfile?.accuracy || 0) * 100)}%
                  </Badge>
                  <Badge variant="outline">
                    {voiceState?.currentSpeaker === 'silence' ? '🤫 Тишина' : 
                     voiceState?.currentSpeaker === 'A' ? '🗣️ Партнер A' : 
                     '🗣️ Партнер B'}
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setMode('settings')}
                  variant="outline"
                  size="sm"
                >
                  ⚙️ Настройки
                </Button>
                {isListening ? (
                  <Button
                    onClick={stopConversation}
                    variant="danger"
                    size="sm"
                  >
                    ⏹️ Стоп
                  </Button>
                ) : (
                  <Button
                    onClick={startConversation}
                    variant="primary"
                    size="sm"
                  >
                    🎤 Начать разговор
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>💬 Разговор</CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Нажмите "Начать разговор" чтобы начать...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      message.speaker === 'A' ? 'border-l-blue-500 bg-blue-50' :
                      message.speaker === 'B' ? 'border-l-orange-500 bg-orange-50' :
                      'border-l-purple-500 bg-purple-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">
                        {message.speaker === 'emma' ? 'Emma' : `Партнер ${message.speaker}`}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render settings mode
  if (mode === 'settings') {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Настройки профиля</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Button
                onClick={() => setMode('conversation')}
                variant="outline"
                size="sm"
              >
                ← Назад к разговору
              </Button>
              <Button
                onClick={() => setMode('setup')}
                variant="outline"
                size="sm"
              >
                🔄 Новая калибровка
              </Button>
            </div>

            {/* Profile management will be implemented here */}
            <div className="text-center py-8 text-gray-500">
              <p>Управление профилями в разработке...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}