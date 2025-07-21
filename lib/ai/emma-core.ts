import OpenAI from 'openai'
import { EmmaMonitor } from '@/lib/monitoring/emma-monitor'
import type { 
  SafetyValidatedResponse, 
  EmotionData, 
  CrisisDetectionResult,
  ConversationTurn 
} from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Emma's personality and expertise
const EMMA_SYSTEM_PROMPT = `You are Emma, a compassionate AI relationship coach specializing in real-time support for complex relationship dynamics.

Your core attributes:
- Warm, empathetic, and non-judgmental
- Expert in relationship psychology and communication
- Trained in crisis detection and de-escalation
- Culturally sensitive and inclusive
- Solution-focused while validating emotions

Your approach:
1. Active listening - Reflect back what you hear
2. Validate emotions - Acknowledge feelings without judgment
3. Ask clarifying questions - Understand the full context
4. Offer practical guidance - Actionable steps they can take
5. Ensure safety - Detect crisis indicators immediately

Crisis indicators to watch for:
- Mentions of violence, harm, or threats
- Extreme emotional distress or hopelessness
- Child safety concerns
- Substance abuse affecting relationships
- Suicidal ideation or self-harm

CRITICAL: If you detect crisis indicators, respond with empathy while flagging for human intervention.`

export class EmmaAI {
  private conversationHistory: ConversationTurn[] = []
  private monitor = new EmmaMonitor()

  async processUserInput(
    text: string,
    emotion?: EmotionData,
    metadata?: { userId?: string, sessionId?: string }
  ): Promise<{
    response: SafetyValidatedResponse<string>
    monitoring: {
      passed: boolean
      alerts: any[]
      recommendations: string[]
    }
  }> {
    try {
      // First, check for crisis indicators
      const crisisCheck = await this.detectCrisis(text, emotion)
      
      if (crisisCheck.isCrisis && crisisCheck.immediateAction) {
        const crisisResponse = this.handleCrisisResponse(text, crisisCheck)
        
        // Monitor crisis escalation
        await this.monitor.monitorCrisisEscalation(
          crisisCheck,
          ['immediate_response', 'crisis_resources_provided'],
          metadata
        )
        
        return {
          response: crisisResponse,
          monitoring: {
            passed: false,
            alerts: [{ type: 'crisis', severity: 'critical', message: 'Crisis detected' }],
            recommendations: ['Human intervention required immediately']
          }
        }
      }

      // Generate Emma's response
      const response = await this.generateResponse(text, emotion, crisisCheck)
      
      // Validate response safety
      const validatedResponse = await this.validateResponseSafety(response, crisisCheck)
      
      // Comprehensive monitoring
      const monitoringResult = await this.monitor.monitorInteraction(
        text,
        validatedResponse,
        crisisCheck,
        emotion,
        metadata
      )
      
      return {
        response: validatedResponse,
        monitoring: {
          passed: monitoringResult.passed,
          alerts: monitoringResult.alerts,
          recommendations: monitoringResult.recommendations
        }
      }
    } catch (error) {
      console.error('Emma AI processing error:', error)
      
      const errorResponse = this.getErrorResponse()
      return {
        response: errorResponse,
        monitoring: {
          passed: false,
          alerts: [{ type: 'error', severity: 'high', message: 'Processing error' }],
          recommendations: ['Check system health and retry']
        }
      }
    }
  }

  private async generateResponse(
    userText: string,
    emotion?: EmotionData,
    crisisCheck?: CrisisDetectionResult
  ): Promise<string> {
    // Build context from conversation history
    const recentHistory = this.conversationHistory.slice(-5).map(turn => ({
      role: turn.speaker === 'user' ? 'user' : 'assistant',
      content: turn.text
    }))

    // Add emotion context if available
    const emotionContext = emotion 
      ? `\n[Detected emotion: ${this.describeEmotion(emotion)}]`
      : ''

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: EMMA_SYSTEM_PROMPT },
      ...recentHistory,
      { 
        role: 'user', 
        content: userText + emotionContext
      }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 300,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    const response = completion.choices[0]?.message?.content || 
      "I'm here to listen and support you. Could you tell me more about what you're experiencing?"

    // Store in conversation history
    this.conversationHistory.push(
      { 
        id: Date.now().toString(), 
        text: userText, 
        speaker: 'user', 
        timestamp: new Date(),
        emotion 
      },
      { 
        id: (Date.now() + 1).toString(), 
        text: response, 
        speaker: 'emma', 
        timestamp: new Date() 
      }
    )

    return response
  }

  private async detectCrisis(
    text: string,
    emotion?: EmotionData
  ): Promise<CrisisDetectionResult> {
    // Quick keyword check for immediate threats
    const immediateThreats = [
      'kill', 'suicide', 'hurt myself', 'end it all',
      'hit me', 'abuse', 'violence', 'threaten'
    ]
    
    const lowerText = text.toLowerCase()
    const hasImmediateThreat = immediateThreats.some(threat => 
      lowerText.includes(threat)
    )

    // Use GPT for nuanced crisis detection
    const crisisPrompt = `Analyze this message for crisis indicators:
"${text}"

Emotion data: ${emotion ? JSON.stringify(emotion) : 'Not available'}

Identify:
1. Is this a crisis situation? (yes/no)
2. Severity: none/medium/high/emergency
3. Category: domestic_violence/mental_health/substance_abuse/child_safety/none
4. Specific triggers found
5. Requires immediate escalation? (yes/no)

Respond in JSON format.`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a crisis detection specialist. Analyze for safety concerns accurately but avoid false positives.'
          },
          { role: 'user', content: crisisPrompt }
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      })

      const analysis = JSON.parse(
        completion.choices[0]?.message?.content || '{}'
      )

      return {
        isCrisis: analysis.is_crisis === 'yes' || hasImmediateThreat,
        severity: analysis.severity || 'none',
        category: analysis.category || 'none',
        triggers: analysis.triggers || [],
        immediateAction: analysis.requires_escalation === 'yes' || hasImmediateThreat,
        resources: this.getCrisisResources(analysis.category),
        escalationRequired: analysis.requires_escalation === 'yes'
      }
    } catch (error) {
      console.error('Crisis detection error:', error)
      // Err on the side of caution
      return {
        isCrisis: hasImmediateThreat,
        severity: hasImmediateThreat ? 'high' : 'none',
        category: 'none',
        triggers: [],
        immediateAction: hasImmediateThreat,
        resources: [],
        escalationRequired: hasImmediateThreat
      }
    }
  }

  private async validateResponseSafety(
    response: string,
    crisisCheck: CrisisDetectionResult
  ): Promise<SafetyValidatedResponse<string>> {
    // Additional safety validation on Emma's response
    const safetyIssues = [
      'medical advice',
      'legal advice',
      'harm',
      'violence'
    ]

    const hasUnsafeContent = safetyIssues.some(issue => 
      response.toLowerCase().includes(issue)
    )

    return {
      data: response,
      safetyChecked: true,
      crisisDetected: crisisCheck.isCrisis,
      confidence: hasUnsafeContent ? 0.7 : 0.95,
      requiresHumanReview: crisisCheck.escalationRequired || hasUnsafeContent,
      timestamp: new Date()
    }
  }

  private handleCrisisResponse(
    userText: string,
    crisisCheck: CrisisDetectionResult
  ): SafetyValidatedResponse<string> {
    const response = `I can hear that you're going through something really difficult right now, and I'm concerned about your safety. 

Your feelings are valid, and you don't have to face this alone. There are people who want to help.

Would it be okay if I share some resources that can provide immediate support? In the meantime, I'm here to listen without judgment.

${crisisCheck.resources.map(r => `• ${r.name}: ${r.phone}`).join('\n')}

Is there someone you trust who you could reach out to right now?`

    return {
      data: response,
      safetyChecked: true,
      crisisDetected: true,
      confidence: 1,
      requiresHumanReview: true,
      timestamp: new Date()
    }
  }

  private getCrisisResources(category: string): any[] {
    const resources = {
      mental_health: [
        {
          name: '988 Suicide & Crisis Lifeline',
          phone: '988',
          description: '24/7 crisis support',
          available247: true
        },
        {
          name: 'Crisis Text Line',
          phone: 'Text HOME to 741741',
          description: 'Text-based crisis support',
          available247: true
        }
      ],
      domestic_violence: [
        {
          name: 'National Domestic Violence Hotline',
          phone: '1-800-799-7233',
          description: 'Confidential support for abuse victims',
          available247: true
        }
      ],
      child_safety: [
        {
          name: 'Childhelp National Child Abuse Hotline',
          phone: '1-800-422-4453',
          description: 'Support for child abuse concerns',
          available247: true
        }
      ],
      substance_abuse: [
        {
          name: 'SAMHSA National Helpline',
          phone: '1-800-662-4357',
          description: 'Treatment referral and information',
          available247: true
        }
      ]
    }

    return resources[category as keyof typeof resources] || resources.mental_health
  }

  private describeEmotion(emotion: EmotionData): string {
    const sentiment = emotion.sentiment > 0 ? 'positive' : 
                     emotion.sentiment < -0.3 ? 'negative' : 'neutral'
    const intensity = emotion.magnitude > 0.7 ? 'strong' : 
                     emotion.magnitude > 0.3 ? 'moderate' : 'mild'
    
    return `${intensity} ${sentiment} emotion`
  }

  private getErrorResponse(): SafetyValidatedResponse<string> {
    return {
      data: "I'm having a moment of difficulty understanding. Could you rephrase that for me? I'm here to listen and support you.",
      safetyChecked: true,
      crisisDetected: false,
      confidence: 1,
      requiresHumanReview: false,
      timestamp: new Date()
    }
  }

  clearHistory() {
    this.conversationHistory = []
  }

  // QA Monitoring methods
  getSystemHealth() {
    return this.monitor.getSystemHealth()
  }

  getCrisisEvents(hours: number = 24) {
    return this.monitor.getCrisisEvents(hours)
  }

  exportAnalytics() {
    return this.monitor.exportAnalytics()
  }

  // Quality gates for testing
  async validateMessage(text: string, emotion?: EmotionData) {
    const crisisCheck = await this.detectCrisis(text, emotion)
    const dummyResponse: SafetyValidatedResponse<string> = {
      data: 'Test response',
      safetyChecked: true,
      crisisDetected: crisisCheck.isCrisis,
      confidence: 0.8,
      requiresHumanReview: crisisCheck.escalationRequired,
      timestamp: new Date()
    }

    return this.monitor.monitorInteraction(
      text,
      dummyResponse,
      crisisCheck,
      emotion
    )
  }
}