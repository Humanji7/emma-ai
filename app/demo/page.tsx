'use client'

import { useState } from 'react'
import { VoiceInterface } from '@/components/voice'
import { Button } from '@/components/ui/Button'
import type { VoiceMessage } from '@/types'

export default function DemoPage() {
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUserInput = async (text: string) => {
    setError(null)
    
    // Add user message
    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      speaker: 'user'
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    try {
      // Call Emma AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          // In production, would include emotion data from voice analysis
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from Emma')
      }

      const data = await response.json()
      
      // Add Emma's response
      const emmaMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        timestamp: new Date(),
        speaker: 'emma'
      }
      
      setMessages(prev => [...prev, emmaMessage])

      // Check for crisis
      if (data.metadata?.crisisDetected) {
        console.warn('Crisis detected - would trigger intervention workflow')
      }

    } catch (err) {
      console.error('Error:', err)
      setError('Sorry, I had trouble processing that. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleError = (error: string) => {
    setError(error)
    console.error('Voice error:', error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-trust-50 via-neutral-50 to-warm-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-trust-800">Emma AI</h1>
              <p className="text-sm text-neutral-600">Your relationship wellness companion</p>
            </div>
            <div className="text-sm text-neutral-500">
              Demo Mode
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-trust-800 mb-4">
              Hi, I'm Emma
            </h2>
            <p className="text-lg text-neutral-700 mb-8 max-w-2xl mx-auto">
              I'm here to listen and support you through relationship challenges. 
              Everything you share is confidential and judgment-free.
            </p>
            <div className="bg-white/60 rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-neutral-600 mb-4">
                You can talk to me about:
              </p>
              <ul className="text-left text-neutral-700 space-y-2">
                <li>• Communication challenges</li>
                <li>• Relationship stress</li>
                <li>• Family dynamics</li>
                <li>• Personal boundaries</li>
                <li>• Emotional well-being</li>
              </ul>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="mb-8 space-y-4 max-h-[400px] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.speaker === 'user'
                      ? 'bg-warm-100 text-neutral-800 rounded-br-sm'
                      : 'bg-white text-neutral-800 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <p className="text-xs text-neutral-500 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-trust-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-trust-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-trust-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voice Interface */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <VoiceInterface
            onUserInput={handleUserInput}
            onError={handleError}
            disabled={isProcessing}
            prompt={isProcessing ? "Emma is thinking..." : "Tap to share what's on your mind"}
          />
          
          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-crisis-50 border border-crisis-200 rounded-lg p-4">
              <p className="text-crisis-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        {messages.length > 0 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => {
                setMessages([])
                setError(null)
              }}
              disabled={isProcessing}
            >
              Start New Conversation
            </Button>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="mt-8 text-center text-xs text-neutral-500">
          <p>🔒 Your conversation is private and secure</p>
          <p className="mt-1">Emma AI will alert human support only in crisis situations</p>
        </div>
      </div>
    </div>
  )
}