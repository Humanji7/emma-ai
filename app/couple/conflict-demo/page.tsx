'use client'

import { useState } from 'react'
import { ConflictInterventionService } from '@/services/ConflictInterventionService'
import type { CoupleVoiceMessage, Speaker, ConflictMetrics } from '@/types'

const conflictService = new ConflictInterventionService()

export default function ConflictDemoPage() {
  const [messages, setMessages] = useState<CoupleVoiceMessage[]>([])
  const [conflictMetrics, setConflictMetrics] = useState<ConflictMetrics>({
    currentLevel: 0,
    escalationTrend: 'stable',
    blamePatternCount: 0,
    interruptionCount: 0,
    lastInterventionTime: 0,
    sessionStartTime: Date.now()
  })
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('A')

  // Demo scenarios with escalating conflict patterns
  const demoScenarios = {
    'Household Chores': [
      { speaker: 'A' as Speaker, text: "I feel like I'm always doing the dishes while you just watch TV." },
      { speaker: 'B' as Speaker, text: "That's not true! I did them yesterday!" },
      { speaker: 'A' as Speaker, text: "You NEVER help with cleaning! You always make excuses!" },
      { speaker: 'B' as Speaker, text: "Whatever, you're being dramatic as usual." },
      { speaker: 'A' as Speaker, text: "I can't believe how selfish you are!" },
      { speaker: 'B' as Speaker, text: "Fine! I don't care anymore, do whatever you want!" }
    ],
    'Crisis Scenario': [
      { speaker: 'A' as Speaker, text: "I'm so tired of this relationship!" },
      { speaker: 'B' as Speaker, text: "You always say that but never do anything about it!" },
      { speaker: 'A' as Speaker, text: "Maybe I should just leave and be done with this!" },
      { speaker: 'B' as Speaker, text: "Red pineapple - I need help!" }
    ],
    'Gottman Horsemen': [
      { speaker: 'A' as Speaker, text: "You're so irresponsible with money!" },
      { speaker: 'B' as Speaker, text: "It's not my fault the car broke down!" },
      { speaker: 'A' as Speaker, text: "You always blame something else, you never take responsibility!" },
      { speaker: 'B' as Speaker, text: "Whatever, you're such a control freak anyway." }
    ]
  }

  const addMessage = (text: string, speaker: Speaker, emotionalTone: 'calm' | 'frustrated' | 'angry' | 'defensive' | 'sad' = 'calm') => {
    const newMessage: CoupleVoiceMessage = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      speaker,
      emotionalTone
    }

    // Analyze with conflict service
    const analysis = conflictService.analyzeMessage(newMessage)
    
    // Update message with conflict level
    newMessage.conflictLevel = analysis.conflictLevel

    // Add user message
    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)

    // Add Emma intervention if needed
    if (analysis.shouldIntervene && analysis.emmaResponse) {
      const emmaMessage: CoupleVoiceMessage = {
        id: (Date.now() + 1).toString(),
        text: analysis.emmaResponse,
        timestamp: new Date(),
        speaker: 'emma',
        emotionalTone: 'calm',
        conflictLevel: 0
      }
      setMessages([...updatedMessages, emmaMessage])
    }

    // Update metrics
    setConflictMetrics(conflictService.getConflictMetrics())
  }

  const runScenario = (scenarioName: keyof typeof demoScenarios) => {
    // Reset
    conflictService.resetSession()
    setMessages([])
    setConflictMetrics(conflictService.getConflictMetrics())

    const scenario = demoScenarios[scenarioName]
    
    // Add messages with delay to simulate conversation
    scenario.forEach((msg, index) => {
      setTimeout(() => {
        const emotionalTone = index > 2 ? 'angry' : index > 1 ? 'frustrated' : 'calm'
        addMessage(msg.text, msg.speaker, emotionalTone as any)
      }, index * 2000) // 2 second delay between messages
    })
  }

  const getSpeakerColor = (speaker: Speaker | 'emma') => {
    switch (speaker) {
      case 'A':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'B':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'emma':
        return 'bg-green-100 border-green-300 text-green-800'
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
    }
  }

  const getConflictLevelColor = (level: number) => {
    if (level >= 8) return 'text-red-600 font-bold'
    if (level >= 6) return 'text-orange-600 font-semibold'
    if (level >= 4) return 'text-yellow-600'
    if (level >= 2) return 'text-blue-600'
    return 'text-green-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-neutral-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Conflict Intervention Demo</h1>
              <p className="text-sm text-neutral-600">Emma's Gottman Method coaching in action</p>
            </div>
            <div className="text-sm text-neutral-500">
              Demo Mode
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Demo Scenarios</h2>
              
              <div className="space-y-3">
                {Object.keys(demoScenarios).map((scenario) => (
                  <button
                    key={scenario}
                    onClick={() => runScenario(scenario as keyof typeof demoScenarios)}
                    className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Run "{scenario}" Scenario
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-200">
                <h3 className="text-md font-semibold mb-3">Manual Input</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setCurrentSpeaker(currentSpeaker === 'A' ? 'B' : 'A')}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentSpeaker === 'A' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    Speaking: {getSpeakerLabel(currentSpeaker)}
                  </button>
                  
                  <textarea
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none"
                    rows={3}
                    placeholder="Enter message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        const text = e.currentTarget.value.trim()
                        if (text) {
                          addMessage(text, currentSpeaker)
                          e.currentTarget.value = ''
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-200">
                <button
                  onClick={() => {
                    conflictService.resetSession()
                    setMessages([])
                    setConflictMetrics(conflictService.getConflictMetrics())
                  }}
                  className="w-full px-4 py-2 bg-neutral-500 hover:bg-neutral-600 text-white rounded-lg transition-colors text-sm"
                >
                  Reset Session
                </button>
              </div>
            </div>

            {/* Conflict Metrics */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">Conflict Metrics</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Current Level:</span>
                  <span className={`text-lg font-bold ${getConflictLevelColor(conflictMetrics.currentLevel)}`}>
                    {conflictMetrics.currentLevel.toFixed(1)}/10
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Trend:</span>
                  <span className={`text-sm font-medium ${
                    conflictMetrics.escalationTrend === 'escalating' ? 'text-red-600' :
                    conflictMetrics.escalationTrend === 'de-escalating' ? 'text-green-600' :
                    'text-neutral-600'
                  }`}>
                    {conflictMetrics.escalationTrend}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Blame Patterns:</span>
                  <span className="text-sm font-medium text-neutral-800">
                    {conflictMetrics.blamePatternCount}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Session Time:</span>
                  <span className="text-sm font-medium text-neutral-800">
                    {Math.round((Date.now() - conflictMetrics.sessionStartTime) / 60000)}m
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conversation Display */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Conversation</h2>
              
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-neutral-500">Select a demo scenario or add manual messages to see Emma's conflict intervention in action.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.speaker === 'A' ? 'justify-start' : 
                        message.speaker === 'B' ? 'justify-end' : 
                        'justify-center'
                      }`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl border-2 ${getSpeakerColor(message.speaker)} ${
                        message.speaker === 'A' ? 'rounded-bl-sm' :
                        message.speaker === 'B' ? 'rounded-br-sm' :
                        'rounded-lg'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold uppercase tracking-wide">
                              {getSpeakerLabel(message.speaker)}
                            </span>
                            {message.speaker === 'emma' && (
                              <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                INTERVENTION
                              </span>
                            )}
                          </div>
                          <span className="text-xs opacity-60">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <p className="whitespace-pre-wrap">{message.text}</p>
                        
                        {message.conflictLevel !== undefined && message.conflictLevel > 0 && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              message.conflictLevel >= 7 ? 'bg-red-100 text-red-700' :
                              message.conflictLevel >= 4 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              Conflict: {message.conflictLevel.toFixed(1)}/10
                            </span>
                            {message.emotionalTone && message.emotionalTone !== 'calm' && (
                              <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">
                                {message.emotionalTone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gottman Method Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">Gottman Method Detection</h2>
              
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-medium mb-2 text-red-600">🐴 Four Horsemen (Destructive)</h3>
                  <ul className="space-y-1 text-neutral-700">
                    <li><strong>Criticism:</strong> "You always/never..."</li>
                    <li><strong>Contempt:</strong> Superiority, eye-rolling</li>
                    <li><strong>Defensiveness:</strong> "It's not my fault..."</li>
                    <li><strong>Stonewalling:</strong> "Fine", "Whatever"</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2 text-green-600">✨ Interventions</h3>
                  <ul className="space-y-1 text-neutral-700">
                    <li><strong>I-statements:</strong> Focus on feelings</li>
                    <li><strong>Active listening:</strong> Reflect back</li>
                    <li><strong>De-escalation:</strong> Pause and breathe</li>
                    <li><strong>Appreciation:</strong> Find positives</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}