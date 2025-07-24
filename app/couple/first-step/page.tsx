'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CoupleVoiceRecorder } from '@/components/voice'
import { VoiceCalibrationWizard } from '@/components/voice/VoiceCalibrationWizard'
import { cn } from '@/lib/utils'
import type { VoiceRecorderState, Speaker, CoupleVoiceMessage } from '@/types'

type SetupStep = 'welcome' | 'calibration' | 'testing' | 'ready'

export default function CoupleFirstStepPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome')
  const [recorderState, setRecorderState] = useState<VoiceRecorderState>('idle')
  const [testMessages, setTestMessages] = useState<CoupleVoiceMessage[]>([])
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('A')
  const [audioLevelA, setAudioLevelA] = useState(0)
  const [audioLevelB, setAudioLevelB] = useState(0)
  const [useAutoDetection, setUseAutoDetection] = useState(false)
  const [useAdvancedDetection, setUseAdvancedDetection] = useState(false)
  const [useCalibratedDetection, setUseCalibratedDetection] = useState(false)
  const [successfulSwitches, setSuccessfulSwitches] = useState(0)

  const handleTranscription = (text: string, speaker: Speaker) => {
    const newMessage: CoupleVoiceMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date(),
      speaker,
      conflictLevel: 0,
      emotionalTone: 'calm'
    }

    // Track successful speaker switches for testing
    if (testMessages.length > 0) {
      const lastMessage = testMessages[testMessages.length - 1]
      if (lastMessage.speaker !== speaker && 
          lastMessage.speaker !== 'emma' && 
          (speaker === 'A' || speaker === 'B')) {
        setSuccessfulSwitches(prev => prev + 1)
        console.log(`🎯 Successful speaker switch detected: ${lastMessage.speaker} → ${speaker}`)
      }
    }

    setTestMessages(prev => [...prev, newMessage])
    console.log(`💬 Test message from ${speaker}:`, text)
  }

  const handleError = (error: string) => {
    console.error('🚨 Voice setup error:', error)
  }

  const handleAudioLevel = (levelA: number, levelB: number) => {
    setAudioLevelA(levelA)
    setAudioLevelB(levelB)
  }

  const handleSpeakerChange = (speaker: Speaker) => {
    setCurrentSpeaker(speaker)
    console.log(`🎤 Speaker switched to: ${speaker}`)
  }

  const getSpeakerColor = (speaker: Speaker | 'emma') => {
    switch (speaker) {
      case 'A':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'B':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'emma':
        return 'bg-green-100 border-green-300 text-green-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getSpeakerLabel = (speaker: Speaker | 'emma') => {
    switch (speaker) {
      case 'A':
        return 'Partner A'
      case 'B':
        return 'Partner B'
      case 'emma':
        return 'Emma'
      default:
        return 'Unknown'
    }
  }

  const goToNextStep = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('calibration')
        break
      case 'calibration':
        setCurrentStep('testing')
        break
      case 'testing':
        setCurrentStep('ready')
        break
      case 'ready':
        // Navigate to main couple page
        router.push('/couple')
        break
    }
  }

  const startCoupleSession = () => {
    // Save calibration settings to localStorage or context
    const calibrationSettings = {
      useAutoDetection,
      useAdvancedDetection,
      useCalibratedDetection,
      completedSetup: true
    }
    
    localStorage.setItem('emmaVoiceCalibration', JSON.stringify(calibrationSettings))
    router.push('/couple')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Emma AI - Couple Setup</h1>
              <p className="text-sm text-neutral-600">Voice calibration and testing before your session</p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Step indicator */}
              <div className="flex space-x-2">
                {['welcome', 'calibration', 'testing', 'ready'].map((step, index) => (
                  <div
                    key={step}
                    className={cn(
                      'w-3 h-3 rounded-full transition-colors',
                      step === currentStep ? 'bg-purple-600' :
                      ['welcome', 'calibration', 'testing', 'ready'].indexOf(currentStep) > index 
                        ? 'bg-purple-300' : 'bg-gray-200'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500 ml-4 capitalize">
                {currentStep} {['welcome', 'calibration', 'testing', 'ready'].indexOf(currentStep) + 1}/4
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                👥 Welcome to Emma's Couple Session
              </h2>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Before we start your relationship coaching session, let's set up voice detection 
                so Emma can distinguish between both partners and provide personalized guidance.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="text-3xl mb-4">🎤</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Voice Setup</h3>
                  <p className="text-sm text-gray-600">
                    Calibrate microphone and test voice detection for both partners
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="text-3xl mb-4">🧘‍♀️</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Emma Training</h3>
                  <p className="text-sm text-gray-600">
                    Help Emma learn to recognize each partner's speaking patterns
                  </p>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="text-3xl mb-4">💬</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Session Ready</h3>
                  <p className="text-sm text-gray-600">
                    Start your coaching session with optimized voice detection
                  </p>
                </div>
              </div>

              <button
                onClick={goToNextStep}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-lg transition-colors"
              >
                Start Voice Setup →
              </button>
            </div>
          </div>
        )}

        {/* Calibration Step */}
        {currentStep === 'calibration' && (
          <div className="py-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🔧 Voice Detection Setup
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Choose your preferred voice detection method. Each option offers different 
                levels of accuracy and setup complexity.
              </p>
            </div>

            {/* Detection Mode Selection */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Auto Detection */}
              <div 
                className={cn(
                  'bg-white rounded-xl p-6 border-2 cursor-pointer transition-all',
                  useAutoDetection && !useAdvancedDetection && !useCalibratedDetection
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-purple-300'
                )}
                onClick={() => {
                  setUseAutoDetection(true)
                  setUseAdvancedDetection(false)
                  setUseCalibratedDetection(false)
                }}
              >
                <div className="text-3xl mb-4">🎯</div>
                <h3 className="font-semibold text-gray-900 mb-2">Auto Detection</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Automatic learning mode. Emma learns to distinguish speakers during conversation.
                </p>
                <div className="text-xs text-gray-500">
                  <div>✅ Easy setup</div>
                  <div>✅ Improves over time</div>
                  <div>⚠️ ~75% accuracy initially</div>
                </div>
              </div>

              {/* Hybrid AI Detection */}
              <div 
                className={cn(
                  'bg-white rounded-xl p-6 border-2 cursor-pointer transition-all',
                  useAdvancedDetection
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                )}
                onClick={() => {
                  setUseAutoDetection(false)
                  setUseAdvancedDetection(true)
                  setUseCalibratedDetection(false)
                }}
              >
                <div className="text-3xl mb-4">🚀</div>
                <h3 className="font-semibold text-gray-900 mb-2">Hybrid AI</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Advanced ML + voice embeddings. Neural networks with voice pattern recognition.
                </p>
                <div className="text-xs text-gray-500">
                  <div>✅ ~85% accuracy</div>
                  <div>✅ Real-time learning</div>
                  <div>⚠️ Requires initial training</div>
                </div>
              </div>

              {/* Calibrated Detection */}
              <div 
                className={cn(
                  'bg-white rounded-xl p-6 border-2 cursor-pointer transition-all',
                  useCalibratedDetection
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                )}
                onClick={() => {
                  setUseAutoDetection(false)
                  setUseAdvancedDetection(false)
                  setUseCalibratedDetection(true)
                }}
              >
                <div className="text-3xl mb-4">🔊</div>
                <h3 className="font-semibold text-gray-900 mb-2">Calibrated</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Personalized voice profiles. Each partner records samples for optimal accuracy.
                </p>
                <div className="text-xs text-gray-500">
                  <div>✅ ~90% accuracy</div>
                  <div>✅ Personalized profiles</div>
                  <div>⚠️ 5-10 min setup</div>
                </div>
              </div>
            </div>

            {/* Calibration Wizard */}
            {useCalibratedDetection && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Voice Profile Creation
                </h3>
                <VoiceCalibrationWizard 
                  onComplete={(profiles) => {
                    console.log('Voice profiles created:', profiles)
                  }}
                />
              </div>
            )}

            <div className="text-center">
              <button
                onClick={goToNextStep}
                disabled={!useAutoDetection && !useAdvancedDetection && !useCalibratedDetection}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium text-lg transition-colors"
              >
                Continue to Testing →
              </button>
            </div>
          </div>
        )}

        {/* Testing Step */}
        {currentStep === 'testing' && (
          <div className="py-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🧪 Test Voice Detection
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Let's test the voice detection system. Take turns speaking to verify 
                Emma can distinguish between both partners.
              </p>
            </div>

            {/* Test Messages Display */}
            {testMessages.length > 0 && (
              <div className="mb-8 space-y-4 max-h-[300px] overflow-y-auto bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Test Conversation:</h3>
                {testMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.speaker === 'A' ? 'justify-start' : 
                      message.speaker === 'B' ? 'justify-end' : 
                      'justify-center'
                    }`}
                  >
                    <div className={`max-w-[70%] p-3 rounded-2xl border ${getSpeakerColor(message.speaker)} ${
                      message.speaker === 'A' ? 'rounded-bl-sm' :
                      message.speaker === 'B' ? 'rounded-br-sm' :
                      'rounded-lg'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {getSpeakerLabel(message.speaker)}
                        </span>
                        <span className="text-xs opacity-60">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Audio Level Visualization */}
            <div className="mb-6 flex justify-center space-x-8">
              <div className="text-center">
                <p className="text-sm font-medium text-blue-700 mb-2">Partner A</p>
                <div className="w-24 h-6 bg-blue-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-150"
                    style={{ width: `${audioLevelA * 100}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">{(audioLevelA * 100).toFixed(0)}%</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-orange-700 mb-2">Partner B</p>
                <div className="w-24 h-6 bg-orange-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all duration-150"
                    style={{ width: `${audioLevelB * 100}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">{(audioLevelB * 100).toFixed(0)}%</p>
              </div>
            </div>

            {/* Voice Interface for Testing */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <CoupleVoiceRecorder
                state={recorderState}
                onStateChange={setRecorderState}
                onTranscription={handleTranscription}
                onError={handleError}
                onAudioLevel={handleAudioLevel}
                onSpeakerChange={handleSpeakerChange}
                coupleMode={true}
                detectionMode="hybrid"
                pauseThreshold={400}
                useAutoDetection={useAutoDetection}
                useAdvancedDetection={useAdvancedDetection}
                useCalibratedDetection={useCalibratedDetection}
              />
              
              <div className="mt-4 text-center">
                <p className="text-sm text-neutral-600">
                  Currently detecting: <span className={`font-semibold ${
                    currentSpeaker === 'A' ? 'text-blue-700' : 'text-orange-700'
                  }`}>
                    {getSpeakerLabel(currentSpeaker)}
                  </span>
                </p>
              </div>
            </div>

            {/* Test Results */}
            {testMessages.length > 0 && (
              <div className="bg-green-50 rounded-xl p-6 border border-green-200 mb-8">
                <h3 className="font-semibold text-green-800 mb-4">Detection Performance:</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{successfulSwitches}</p>
                    <p className="text-xs text-green-700">Successful Switches</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{testMessages.length}</p>
                    <p className="text-xs text-green-700">Total Messages</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {testMessages.length > 1 ? Math.round((successfulSwitches / Math.max(testMessages.length - 1, 1)) * 100) : 0}%
                    </p>
                    <p className="text-xs text-green-700">Detection Rate</p>
                  </div>
                </div>
              </div>
            )}

            {/* Testing Instructions */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-8">
              <h3 className="font-semibold text-blue-800 mb-2">Testing Instructions:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. Partner A: Say "Hello, I'm Partner A"</li>
                <li>2. Partner B: Say "Hello, I'm Partner B"</li>
                <li>3. Take turns speaking short sentences</li>
                <li>4. Watch the detection accuracy above</li>
              </ul>
            </div>

            <div className="text-center">
              <button
                onClick={goToNextStep}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-lg transition-colors"
              >
                Setup Complete →
              </button>
            </div>
          </div>
        )}

        {/* Ready Step */}
        {currentStep === 'ready' && (
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <div className="text-6xl mb-8">🎉</div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Setup Complete!
              </h2>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Emma is now calibrated and ready to provide personalized relationship coaching. 
                Your voice detection setup will ensure accurate speaker identification throughout your session.
              </p>
              
              <div className="bg-green-50 rounded-xl p-6 border border-green-200 mb-8">
                <h3 className="font-semibold text-green-800 mb-4">Setup Summary:</h3>
                <div className="text-sm text-green-700">
                  <p>Detection Mode: {
                    useCalibratedDetection ? '🔊 Calibrated Detection' :
                    useAdvancedDetection ? '🚀 Hybrid AI Detection' :
                    useAutoDetection ? '🎯 Auto Detection' :
                    'Manual Detection'
                  }</p>
                  <p>Test Messages: {testMessages.length}</p>
                  <p>Detection Rate: {
                    testMessages.length > 1 
                      ? `${Math.round((successfulSwitches / Math.max(testMessages.length - 1, 1)) * 100)}%`
                      : 'N/A'
                  }</p>
                </div>
              </div>

              <button
                onClick={startCoupleSession}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-lg transition-colors"
              >
                Start Couple Session →
              </button>
              
              <p className="text-sm text-gray-500 mt-4">
                You can always return to this setup later from the settings
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}