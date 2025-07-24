import { POST } from '@/app/api/chat/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/ai/emma-core')
jest.mock('@/lib/ratelimit')

const mockEmmaAI = {
  processCoupleInput: jest.fn(),
  processUserInput: jest.fn()
}

jest.mock('@/lib/ai/emma-core', () => ({
  EmmaAI: jest.fn(() => mockEmmaAI)
}))

const mockRatelimit = {
  limit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    reset: Date.now() + 60000,
    remaining: 9
  })
}

jest.mock('@/lib/ratelimit', () => ({
  ratelimit: mockRatelimit
}))

describe('/api/chat - Couple Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should process couple mode requests correctly', async () => {
    const mockResponse = {
      response: {
        data: 'I hear that both of you are experiencing some tension. Let\'s work through this together.',
        safetyChecked: true,
        crisisDetected: false,
        confidence: 0.95,
        requiresHumanReview: false,
        timestamp: new Date()
      },
      monitoring: {
        passed: true,
        alerts: [],
        recommendations: []
      },
      conflictAnalysis: {
        currentLevel: 3,
        escalationTrend: 'stable' as const,
        triggerPatterns: [],
        interventionNeeded: false
      },
      interventionRecommendation: {
        type: 'coaching' as const,
        urgency: 'low' as const,
        suggestion: 'Continue monitoring conversation dynamics'
      },
      speakerContext: {
        currentSpeaker: 'Partner A',
        turnCount: 1,
        lastSpeakerSwitch: true
      }
    }

    mockEmmaAI.processCoupleInput.mockResolvedValue(mockResponse)

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'We keep having the same argument over and over again.',
        coupleMode: true,
        speaker: 'A',
        conflictLevel: 3,
        emotionalTone: 'frustrated',
        conversationHistory: [
          {
            id: '1',
            text: 'This always happens when we try to talk about money.',
            speaker: 'B',
            timestamp: new Date().toISOString(),
            conflictLevel: 2,
            emotionalTone: 'defensive'
          }
        ]
      }),
      headers: {
        'content-type': 'application/json',
        'x-session-id': 'test-session-123',
        'x-user-id': 'test-user-456'
      }
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(mockEmmaAI.processCoupleInput).toHaveBeenCalledWith(
      'We keep having the same argument over and over again.',
      undefined, // emotion
      {
        userId: 'test-user-456',
        sessionId: 'test-session-123',
        coupleMode: true,
        speaker: 'A',
        conflictLevel: 3,
        emotionalTone: 'frustrated',
        conversationHistory: [{
          id: '1',
          text: 'This always happens when we try to talk about money.',
          speaker: 'B',
          timestamp: expect.any(String),
          conflictLevel: 2,
          emotionalTone: 'defensive'
        }]
      }
    )

    expect(result.response).toBe(mockResponse.response.data)
    expect(result.metadata.coupleMode).toBe(true)
    expect(result.metadata.speaker).toBe('A')
    expect(result.metadata.conflictAnalysis).toEqual(mockResponse.conflictAnalysis)
    expect(result.metadata.interventionRecommendation).toEqual(mockResponse.interventionRecommendation)
    expect(result.metadata.speakerContext).toEqual(mockResponse.speakerContext)
  })

  it('should validate couple mode parameters', async () => {
    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test message',
        coupleMode: true,
        speaker: 'invalid-speaker', // Invalid speaker
        conflictLevel: 15 // Invalid conflict level
      }),
      headers: {
        'content-type': 'application/json'
      }
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(400)
    expect(result.error).toContain('Invalid speaker')
  })

  it('should fallback to individual mode when coupleMode is false', async () => {
    const mockResponse = {
      response: {
        data: 'I understand you\'re going through a difficult time.',
        safetyChecked: true,
        crisisDetected: false,
        confidence: 0.9,
        requiresHumanReview: false,
        timestamp: new Date()
      },
      monitoring: {
        passed: true,
        alerts: [],
        recommendations: []
      }
    }

    mockEmmaAI.processUserInput.mockResolvedValue(mockResponse)

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'I need help with my relationship.',
        coupleMode: false
      }),
      headers: {
        'content-type': 'application/json'
      }
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(mockEmmaAI.processUserInput).toHaveBeenCalled()
    expect(mockEmmaAI.processCoupleInput).not.toHaveBeenCalled()
    expect(result.metadata.coupleMode).toBeUndefined()
  })

  it('should handle crisis detection in couple mode', async () => {
    const mockCrisisResponse = {
      response: {
        data: 'I can hear that you\'re going through something really difficult right now, and I\'m concerned about your safety.',
        safetyChecked: true,
        crisisDetected: true,
        confidence: 1,
        requiresHumanReview: true,
        timestamp: new Date()
      },
      monitoring: {
        passed: false,
        alerts: [{ type: 'crisis', severity: 'critical', message: 'Crisis detected in couple session' }],
        recommendations: ['Human intervention required immediately', 'Consider safety protocols']
      },
      conflictAnalysis: {
        currentLevel: 10,
        escalationTrend: 'escalating' as const,
        triggerPatterns: ['threats', 'violence'],
        interventionNeeded: true
      },
      interventionRecommendation: {
        type: 'crisis' as const,
        urgency: 'critical' as const,
        suggestion: 'Immediate professional intervention required'
      }
    }

    mockEmmaAI.processCoupleInput.mockResolvedValue(mockCrisisResponse)

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'I\'m going to hurt you if you keep talking like that.',
        coupleMode: true,
        speaker: 'A',
        conflictLevel: 8
      }),
      headers: {
        'content-type': 'application/json'
      }
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.metadata.crisisDetected).toBe(true)
    expect(result.metadata.requiresHumanReview).toBe(true)
    expect(result.metadata.qualityGates.passed).toBe(false)
  })
})