'use client'

import { useState, useEffect } from 'react'
import { VoiceInterface } from '@/components/voice'
import { Button } from '@/components/ui/Button'
import type { VoiceMessage } from '@/types'

export default function DemoPage() {
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Development mode: Reset processing state on hot reload
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isProcessing) {
      console.log('Dev mode: Resetting processing state after hot reload')
      setIsProcessing(false)
      setError(null)
    }
  }, [])

  const handleUserInput = async (text: string) => {
    // Prevent processing if already processing
    if (isProcessing) {
      return
    }
    
    // Validate input
    if (!text || !text.trim()) {
      setError('Please provide a message.')
      return
    }
    
    setError(null)
    
    // Add user message
    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date(),
      speaker: 'user'
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    try {
      // Call Emma AI API with timeout
      const response = await Promise.race([
        fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text.trim(),
            // In production, would include emotion data from voice analysis
          }),
        }),
        new Promise<Response>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ])

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Validate response data
      if (!data.response) {
        throw new Error('Invalid response from server')
      }
      
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
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          setError('Request timed out. Please check your connection and try again.')
        } else if (err.message.includes('Rate limit')) {
          setError('Too many requests. Please wait a moment and try again.')
        } else {
          setError(`Error: ${err.message}`)
        }
      } else {
        setError('Sorry, I had trouble processing that. Please try again.')
      }
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
              Hi, I&apos;m Emma
            </h2>
            <p className="text-lg text-neutral-700 mb-8 max-w-2xl mx-auto">
              I&apos;m here to listen and support you through relationship challenges. 
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
          
          {/* Text Input Fallback */}
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Or type your message here..."
                className="flex-1 px-4 py-3 border border-neutral-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-trust-400 focus:border-transparent"
                disabled={isProcessing}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim() && !isProcessing) {
                    e.preventDefault()
                    handleUserInput(e.currentTarget.value.trim())
                    e.currentTarget.value = ''
                  }
                }}
              />
              <Button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement
                  if (input?.value.trim() && !isProcessing) {
                    handleUserInput(input.value.trim())
                    input.value = ''
                  }
                }}
                disabled={isProcessing}
                className="px-6 py-3 bg-trust-500 hover:bg-trust-600 disabled:bg-trust-300 disabled:cursor-not-allowed text-white rounded-2xl"
              >
                {isProcessing ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-crisis-50 border border-crisis-200 rounded-lg p-4">
              <p className="text-crisis-700 text-sm">{error}</p>
            </div>
          )}

          {/* Development Debug Controls */}
          {process.env.NODE_ENV === 'development' && (isProcessing || error) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 mb-2">Dev Controls:</p>
              <button
                onClick={() => {
                  setIsProcessing(false)
                  setError(null)
                  console.log('Dev: Reset processing state')
                }}
                className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 mr-2"
              >
                🔄 Reset Processing
              </button>
              <span className="text-xs text-yellow-700">
                Processing: {isProcessing ? '✅' : '❌'} | Error: {error ? '⚠️' : '✅'}
              </span>
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