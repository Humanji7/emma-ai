import OpenAI from 'openai'
import { EmmaMonitor } from '@/lib/monitoring/emma-monitor'
import type { 
  SafetyValidatedResponse, 
  EmotionData, 
  CrisisDetectionResult,
  ConversationTurn 
} from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
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

// Emma's couple-specific system prompt
const EMMA_COUPLE_SYSTEM_PROMPT = `You are Emma, a specialized AI relationship coach for couples therapy and real-time relationship support.

Your expertise in couple dynamics:
- Trained in Gottman Method principles and intervention techniques
- Expert in conflict de-escalation and communication patterns
- Skilled at detecting destructive patterns (criticism, contempt, defensiveness, stonewalling)
- Experienced in facilitating healthy dialogue between partners
- Knowledgeable about attachment styles and their impact on relationships

Your couple-specific approach:
1. Monitor communication patterns - Identify harmful vs. healthy exchanges
2. Facilitate speaker turns - Help partners feel heard and understood
3. Reframe negative interactions - Transform blame into constructive requests
4. Detect escalation early - Intervene before conflicts become destructive
5. Promote empathy - Help each partner understand the other's perspective
6. Ensure safety - Prioritize emotional and physical safety for both partners

Couple conflict patterns to watch for:
- Blame language ("You always..." "You never...")
- Contempt or criticism directed at character/personality
- Defensive responses that escalate conflict
- Stonewalling or emotional withdrawal
- Interrupting or talking over each other
- Bringing up past grievances during current conflicts

Your intervention strategies:
- Timeout suggestions when conflict escalates beyond productive levels
- Communication coaching in real-time
- Empathy bridging between partners
- Conflict reframing from blame to needs/requests
- De-escalation techniques when emotions run high

CRITICAL: In couple mode, you have context about who is speaking (Partner A or Partner B). Use this to personalize your responses and track conversation dynamics between the partners.`

export class EmmaAI {
  private conversationHistory: ConversationTurn[] = []
  private monitor = new EmmaMonitor()

  async processCoupleInput(
    text: string,
    emotion?: EmotionData,
    metadata?: { 
      userId?: string
      sessionId?: string
      coupleMode?: boolean
      speaker?: 'A' | 'B' | 'emma'
      conflictLevel?: number
      emotionalTone?: string
      conversationHistory?: Array<{
        id: string
        text: string
        speaker: 'A' | 'B' | 'emma'
        timestamp: string
        conflictLevel?: number
        emotionalTone?: string
      }>
    }
  ): Promise<{
    response: SafetyValidatedResponse<string>
    monitoring: {
      passed: boolean
      alerts: any[]
      recommendations: string[]
    }
    conflictAnalysis?: {
      currentLevel: number
      escalationTrend: 'escalating' | 'stable' | 'de-escalating'
      triggerPatterns: string[]
      interventionNeeded: boolean
    }
    interventionRecommendation?: {
      type: 'none' | 'coaching' | 'timeout' | 'crisis'
      urgency: 'low' | 'medium' | 'high' | 'critical'
      suggestion: string
    }
    speakerContext?: {
      currentSpeaker: string
      turnCount: number
      lastSpeakerSwitch: boolean
    }
  }> {
    try {
      // Enhanced crisis detection for couple context
      const crisisCheck = await this.detectCoupleCrisis(text, emotion, metadata)
      
      if (crisisCheck.isCrisis && crisisCheck.immediateAction) {
        const crisisResponse = this.handleCrisisResponse(text, crisisCheck)
        
        await this.monitor.monitorCrisisEscalation(
          crisisCheck,
          ['immediate_response', 'crisis_resources_provided'],
          metadata
        )
        
        return {
          response: crisisResponse,
          monitoring: {
            passed: false,
            alerts: [{ type: 'crisis', severity: 'critical', message: 'Crisis detected in couple session' }],
            recommendations: ['Human intervention required immediately', 'Consider safety protocols']
          },
          conflictAnalysis: {
            currentLevel: 10,
            escalationTrend: 'escalating',
            triggerPatterns: crisisCheck.triggers,
            interventionNeeded: true
          },
          interventionRecommendation: {
            type: 'crisis',
            urgency: 'critical',
            suggestion: 'Immediate professional intervention required'
          }
        }
      }

      // Analyze couple dynamics and conflict patterns
      const conflictAnalysis = await this.analyzeCoupleConflict(text, metadata)
      
      // Generate couple-specific response
      const response = await this.generateCoupleResponse(text, emotion, metadata, conflictAnalysis, crisisCheck)
      
      // Validate response safety
      const validatedResponse = await this.validateResponseSafety(response, crisisCheck)
      
      // Comprehensive monitoring for couple sessions
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
        },
        conflictAnalysis,
        interventionRecommendation: this.getInterventionRecommendation(conflictAnalysis, crisisCheck),
        speakerContext: this.getSpeakerContext(metadata)
      }
    } catch (error) {
      console.error('Emma AI couple processing error:', error)
      
      const errorResponse = this.getErrorResponse()
      return {
        response: errorResponse,
        monitoring: {
          passed: false,
          alerts: [{ type: 'error', severity: 'high', message: 'Couple processing error' }],
          recommendations: ['Check system health and retry', 'Consider fallback to individual mode']
        }
      }
    }
  }

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
      role: turn.speaker === 'user' ? 'user' as const : 'assistant' as const,
      content: turn.content
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
        content: userText, 
        speaker: 'user', 
        timestamp: new Date(),
        emotion 
      },
      { 
        id: (Date.now() + 1).toString(), 
        content: response, 
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

  // ===== COUPLE-SPECIFIC METHODS =====

  private async detectCoupleCrisis(
    text: string,
    emotion?: EmotionData,
    metadata?: any
  ): Promise<CrisisDetectionResult> {
    // Enhanced crisis detection for couple context
    const coupleThreats = [
      'hit you', 'hurt you', 'leave you', 'divorce', 'separate',
      'hate you', 'done with us', 'can\'t do this anymore',
      'threatening', 'violence', 'abuse', 'harm'
    ]
    
    const lowerText = text.toLowerCase()
    const hasCoupleThreats = coupleThreats.some(threat => 
      lowerText.includes(threat)
    )

    // Check for escalation patterns in conversation history
    const hasEscalation = metadata?.conversationHistory && 
      this.detectEscalationPattern(metadata.conversationHistory)

    const crisisPrompt = `Analyze this couple therapy message for crisis indicators:

Speaker: ${metadata?.speaker || 'Unknown'}
Message: "${text}"
Conflict Level: ${metadata?.conflictLevel || 0}/10
Emotional Tone: ${metadata?.emotionalTone || 'unknown'}
Conversation Context: ${JSON.stringify(metadata?.conversationHistory?.slice(-3) || [])}

Couple-specific crisis indicators:
1. Threats of violence or harm
2. Mentions of separation/divorce in anger
3. Extreme contempt or character assassination
4. Threats to leave relationship
5. Escalating conflict patterns
6. Safety concerns for either partner

Respond in JSON format with:
- is_crisis: boolean
- severity: none/medium/high/emergency  
- category: domestic_violence/relationship_breakdown/mental_health/none
- couple_specific_triggers: array of specific triggers found
- requires_escalation: boolean
- intervention_type: coaching/timeout/crisis/none`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a couples therapy crisis detection specialist. Analyze for relationship-specific safety concerns.'
          },
          { role: 'user', content: crisisPrompt }
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })

      const analysis = JSON.parse(
        completion.choices[0]?.message?.content || '{}'
      )

      return {
        isCrisis: analysis.is_crisis === true || hasCoupleThreats || hasEscalation,
        severity: analysis.severity || 'none',
        category: analysis.category || 'none',
        triggers: analysis.couple_specific_triggers || [],
        immediateAction: analysis.requires_escalation === true || hasCoupleThreats,
        resources: this.getCrisisResources(analysis.category),
        escalationRequired: analysis.requires_escalation === true
      }
    } catch (error) {
      console.error('Couple crisis detection error:', error)
      return {
        isCrisis: hasCoupleThreats,
        severity: hasCoupleThreats ? 'high' : 'none',
        category: 'relationship_breakdown',
        triggers: [],
        immediateAction: hasCoupleThreats,
        resources: [],
        escalationRequired: hasCoupleThreats
      }
    }
  }

  private async analyzeCoupleConflict(text: string, metadata?: any): Promise<{
    currentLevel: number
    escalationTrend: 'escalating' | 'stable' | 'de-escalating'
    triggerPatterns: string[]
    interventionNeeded: boolean
  }> {
    const conflictPrompt = `Analyze this couple interaction for conflict patterns:

Current Speaker: ${metadata?.speaker || 'Unknown'}
Message: "${text}"
Previous Conflict Level: ${metadata?.conflictLevel || 0}/10
Emotional Tone: ${metadata?.emotionalTone || 'unknown'}

Recent conversation:
${JSON.stringify(metadata?.conversationHistory?.slice(-5) || [])}

Analyze for Gottman's Four Horsemen:
1. Criticism - Attacking character/personality
2. Contempt - Superiority, sarcasm, eye-rolling
3. Defensiveness - Playing victim, counter-attacking
4. Stonewalling - Emotional withdrawal

Also analyze:
- Blame language ("You always...", "You never...")
- Escalation patterns in recent messages
- Turn-taking and interruption patterns
- Emotional regulation vs. dysregulation

Respond in JSON format:
{
  "conflict_level": 0-10,
  "escalation_trend": "escalating/stable/de-escalating",
  "gottman_patterns": ["criticism", "contempt", "defensiveness", "stonewalling"],
  "trigger_phrases": ["specific harmful phrases found"],
  "intervention_needed": boolean,
  "reasoning": "brief explanation"
}`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a Gottman Method expert analyzing couple communication patterns for real-time intervention.'
          },
          { role: 'user', content: conflictPrompt }
        ],
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      })

      const analysis = JSON.parse(
        completion.choices[0]?.message?.content || '{}'
      )

      return {
        currentLevel: Math.min(10, Math.max(0, analysis.conflict_level || 0)),
        escalationTrend: analysis.escalation_trend || 'stable',
        triggerPatterns: [
          ...(analysis.gottman_patterns || []),
          ...(analysis.trigger_phrases || [])
        ],
        interventionNeeded: analysis.intervention_needed || false
      }
    } catch (error) {
      console.error('Conflict analysis error:', error)
      return {
        currentLevel: metadata?.conflictLevel || 0,
        escalationTrend: 'stable',
        triggerPatterns: [],
        interventionNeeded: false
      }
    }
  }

  private async generateCoupleResponse(
    userText: string,
    emotion?: EmotionData,
    metadata?: any,
    conflictAnalysis?: any,
    crisisCheck?: CrisisDetectionResult
  ): Promise<string> {
    // Build couple conversation context
    const coupleHistory = metadata?.conversationHistory?.slice(-8).map((msg: any) => ({
      role: msg.speaker === 'emma' ? 'assistant' as const : 'user' as const,
      content: `[${msg.speaker === 'A' ? 'Partner A' : msg.speaker === 'B' ? 'Partner B' : 'Emma'}]: ${msg.text}`
    })) || []

    // Add emotion and conflict context
    const emotionContext = emotion 
      ? `\n[Detected emotion: ${this.describeEmotion(emotion)}]`
      : ''
    
    const conflictContext = conflictAnalysis 
      ? `\n[Conflict Level: ${conflictAnalysis.currentLevel}/10, Trend: ${conflictAnalysis.escalationTrend}]`
      : ''

    const speakerContext = metadata?.speaker 
      ? `\n[Current Speaker: Partner ${metadata.speaker}]`
      : ''

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: EMMA_COUPLE_SYSTEM_PROMPT },
      ...coupleHistory,
      { 
        role: 'user', 
        content: `[Partner ${metadata?.speaker || 'Unknown'}]: ${userText}${emotionContext}${conflictContext}${speakerContext}`
      }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 400,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    const response = completion.choices[0]?.message?.content || 
      "I can see there's a lot happening between you both right now. Let's take a moment to understand each other's perspectives."

    // Store in conversation history with speaker context
    this.conversationHistory.push(
      { 
        id: Date.now().toString(), 
        content: `[Partner ${metadata?.speaker}]: ${userText}`, 
        speaker: 'user', 
        timestamp: new Date(),
        emotion 
      },
      { 
        id: (Date.now() + 1).toString(), 
        content: response, 
        speaker: 'emma', 
        timestamp: new Date() 
      }
    )

    return response
  }

  private detectEscalationPattern(conversationHistory: any[]): boolean {
    if (!conversationHistory || conversationHistory.length < 3) return false
    
    // Look for increasing conflict levels in recent messages
    const recentLevels = conversationHistory
      .slice(-5)
      .map(msg => msg.conflictLevel || 0)
      .filter(level => level > 0)
    
    if (recentLevels.length >= 3) {
      const trend = recentLevels.slice(-3)
      return trend[2] > trend[1] && trend[1] > trend[0] && trend[2] >= 7
    }
    
    return false
  }

  private getInterventionRecommendation(
    conflictAnalysis: any, 
    crisisCheck: CrisisDetectionResult
  ): {
    type: 'none' | 'coaching' | 'timeout' | 'crisis'
    urgency: 'low' | 'medium' | 'high' | 'critical'
    suggestion: string
  } {
    if (crisisCheck.isCrisis) {
      return {
        type: 'crisis',
        urgency: 'critical',
        suggestion: 'Crisis intervention protocols should be activated immediately'
      }
    }

    if (conflictAnalysis.currentLevel >= 8) {
      return {
        type: 'timeout',
        urgency: 'high',
        suggestion: 'Recommend a 20-minute cooling-off period before continuing the conversation'
      }
    }

    if (conflictAnalysis.currentLevel >= 6 || conflictAnalysis.interventionNeeded) {
      return {
        type: 'coaching',
        urgency: 'medium',
        suggestion: 'Active coaching needed to reframe communication patterns'
      }
    }

    if (conflictAnalysis.currentLevel >= 3) {
      return {
        type: 'coaching',
        urgency: 'low',
        suggestion: 'Gentle guidance to maintain constructive dialogue'
      }
    }

    return {
      type: 'none',
      urgency: 'low',
      suggestion: 'Continue monitoring conversation dynamics'
    }
  }

  private getSpeakerContext(metadata?: any): {
    currentSpeaker: string
    turnCount: number
    lastSpeakerSwitch: boolean
  } {
    const history = metadata?.conversationHistory || []
    const currentSpeaker = metadata?.speaker || 'unknown'
    
    // Count turns for current speaker
    let turnCount = 0
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].speaker === currentSpeaker) {
        turnCount++
      } else {
        break
      }
    }

    // Check if this is a speaker switch
    const lastSpeakerSwitch = history.length > 0 && 
      history[history.length - 1].speaker !== currentSpeaker

    return {
      currentSpeaker: currentSpeaker === 'A' ? 'Partner A' : 
                      currentSpeaker === 'B' ? 'Partner B' : 
                      currentSpeaker,
      turnCount,
      lastSpeakerSwitch
    }
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