import type { 
  Speaker, 
  CoupleVoiceMessage, 
  ConflictMetrics, 
  CoupleConversationState,
  EmmaInterventionTrigger 
} from '@/types'

/**
 * ConflictInterventionService - Emma's couple coaching logic
 * 
 * Features:
 * - Gottman Method pattern detection
 * - Conflict escalation monitoring
 * - De-escalation intervention timing
 * - Emma coaching phrase library
 * - Real-time relationship guidance
 */
export class ConflictInterventionService {
  private conflictMetrics: ConflictMetrics = {
    currentLevel: 0,
    escalationTrend: 'stable',
    blamePatternCount: 0,
    interruptionCount: 0,
    lastInterventionTime: 0,
    sessionStartTime: Date.now()
  }

  private conversationHistory: CoupleVoiceMessage[] = []
  private interventionCooldown: number = 30000 // 30 seconds between interventions
  private criticalEscalationThreshold: number = 7 // Out of 10

  /**
   * Analyze new message for conflict patterns and determine intervention need
   */
  analyzeMessage(message: CoupleVoiceMessage): {
    conflictLevel: number
    shouldIntervene: boolean
    interventionType?: EmmaInterventionTrigger
    emmaResponse?: string
  } {
    // Add to conversation history
    this.conversationHistory.push(message)
    
    // Keep only last 10 messages for analysis
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10)
    }

    // Analyze conflict patterns
    const blamePatterns = this.detectBlamePatterns(message.text)
    const emotionalEscalation = this.detectEmotionalEscalation(message)
    const defensiveResponse = this.detectDefensiveness(message)
    
    // Calculate conflict level (0-10 scale)
    let conflictLevel = this.calculateConflictLevel({
      blamePatterns,
      emotionalEscalation,
      defensiveResponse,
      recentHistory: this.conversationHistory.slice(-3)
    })

    // Update metrics
    this.updateConflictMetrics(conflictLevel, blamePatterns.length > 0)

    // Determine if intervention is needed
    const interventionDecision = this.shouldTriggerIntervention(conflictLevel, message)

    return {
      conflictLevel,
      shouldIntervene: interventionDecision.shouldIntervene,
      interventionType: interventionDecision.type,
      emmaResponse: interventionDecision.shouldIntervene 
        ? this.generateEmmaIntervention(interventionDecision.type!, message)
        : undefined
    }
  }

  /**
   * Detect Gottman's "Four Horsemen" blame patterns
   */
  private detectBlamePatterns(text: string): BlamePattern[] {
    const patterns: BlamePattern[] = []
    const lowerText = text.toLowerCase()

    // 1. Criticism patterns (attacking character vs. behavior)
    const criticismPatterns = [
      /you always/gi,
      /you never/gi,
      /you're so/gi,
      /what's wrong with you/gi,
      /you can't even/gi,
      /typical/gi
    ]

    criticismPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        patterns.push({
          type: 'criticism',
          severity: 'high',
          matched: text.match(pattern)?.[0] || '',
          gottmanCategory: 'criticism'
        })
      }
    })

    // 2. Contempt patterns (superiority, name-calling)
    const contemptPatterns = [
      /idiot/gi,
      /stupid/gi,
      /pathetic/gi,
      /whatever/gi,
      /rolling eyes|eye.roll/gi,
      /obviously/gi
    ]

    contemptPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        patterns.push({
          type: 'contempt',
          severity: 'critical',
          matched: text.match(pattern)?.[0] || '',
          gottmanCategory: 'contempt'
        })
      }
    })

    // 3. Defensiveness patterns
    const defensivenessPatterns = [
      /it's not my fault/gi,
      /i didn't/gi,
      /but you/gi,
      /that's not true/gi,
      /i'm not the one/gi
    ]

    defensivenessPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        patterns.push({
          type: 'defensiveness',
          severity: 'medium',
          matched: text.match(pattern)?.[0] || '',
          gottmanCategory: 'defensiveness'
        })
      }
    })

    // 4. Stonewalling indicators (withdrawal)
    const stonewallingPatterns = [
      /fine/gi,
      /whatever/gi,
      /i don't care/gi,
      /forget it/gi
    ]

    stonewallingPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        patterns.push({
          type: 'stonewalling',
          severity: 'high',
          matched: text.match(pattern)?.[0] || '',
          gottmanCategory: 'stonewalling'
        })
      }
    })

    return patterns
  }

  /**
   * Detect emotional escalation in message
   */
  private detectEmotionalEscalation(message: CoupleVoiceMessage): number {
    let escalationScore = 0

    // Volume/intensity indicators in text
    const intensityPatterns = [
      /[A-Z]{3,}/g, // All caps words
      /!{2,}/g,     // Multiple exclamation marks
      /\?{2,}/g     // Multiple question marks
    ]

    intensityPatterns.forEach(pattern => {
      const matches = message.text.match(pattern)
      if (matches) {
        escalationScore += matches.length * 0.5
      }
    })

    // Emotional tone from message metadata
    if (message.emotionalTone) {
      const toneScores = {
        'angry': 2,
        'frustrated': 1.5,
        'defensive': 1,
        'calm': 0,
        'sad': 0.5
      }
      escalationScore += toneScores[message.emotionalTone] || 0
    }

    return Math.min(escalationScore, 3) // Cap at 3
  }

  /**
   * Detect defensive responses
   */
  private detectDefensiveness(message: CoupleVoiceMessage): boolean {
    const recentMessages = this.conversationHistory.slice(-2)
    if (recentMessages.length < 2) return false

    const previousMessage = recentMessages[0]
    const currentMessage = message

    // Check if responding to different speaker with defensive language
    if (previousMessage.speaker !== currentMessage.speaker) {
      const defensiveKeywords = [
        'but you', 'it\'s not my', 'i didn\'t', 'you\'re the one',
        'that\'s not true', 'i\'m not', 'you always', 'you never'
      ]

      return defensiveKeywords.some(keyword => 
        currentMessage.text.toLowerCase().includes(keyword)
      )
    }

    return false
  }

  /**
   * Calculate overall conflict level (0-10 scale)
   */
  private calculateConflictLevel({
    blamePatterns,
    emotionalEscalation,
    defensiveResponse,
    recentHistory
  }: {
    blamePatterns: BlamePattern[]
    emotionalEscalation: number
    defensiveResponse: boolean
    recentHistory: CoupleVoiceMessage[]
  }): number {
    let level = 0

    // Base score from blame patterns
    blamePatterns.forEach(pattern => {
      const severityScores = {
        'low': 0.5,
        'medium': 1,
        'high': 2,
        'critical': 3
      }
      level += severityScores[pattern.severity]
    })

    // Add emotional escalation
    level += emotionalEscalation

    // Add defensiveness penalty
    if (defensiveResponse) {
      level += 1
    }

    // Consider recent history trend
    if (recentHistory.length >= 3) {
      const recentLevels = recentHistory.map(msg => msg.conflictLevel || 0)
      const trend = recentLevels[2] - recentLevels[0] // Recent vs. older
      if (trend > 0) {
        level += Math.min(trend * 0.5, 1) // Escalation bonus
      }
    }

    // Check for rapid back-and-forth (interruption pattern)
    const speakerSwitches = this.countSpeakerSwitches(recentHistory)
    if (speakerSwitches > 2) {
      level += 0.5 // Quick back-and-forth increases tension
    }

    return Math.min(Math.max(level, 0), 10) // Clamp between 0-10
  }

  /**
   * Determine if Emma should intervene
   */
  private shouldTriggerIntervention(
    conflictLevel: number, 
    message: CoupleVoiceMessage
  ): { shouldIntervene: boolean; type?: EmmaInterventionTrigger } {
    const now = Date.now()
    const timeSinceLastIntervention = now - this.conflictMetrics.lastInterventionTime

    // Check cooldown period
    if (timeSinceLastIntervention < this.interventionCooldown) {
      return { shouldIntervene: false }
    }

    // Crisis detection - immediate intervention
    if (this.detectCrisisKeywords(message.text)) {
      return { shouldIntervene: true, type: 'crisis' }
    }

    // High conflict level - escalation intervention
    if (conflictLevel >= this.criticalEscalationThreshold) {
      return { shouldIntervene: true, type: 'escalation' }
    }

    // Gottman Four Horsemen detection
    const blamePatterns = this.detectBlamePatterns(message.text)
    const hasContempt = blamePatterns.some(p => p.gottmanCategory === 'contempt')
    if (hasContempt) {
      return { shouldIntervene: true, type: 'gottman_horsemen' }
    }

    // Pattern-based intervention (after 3+ blame patterns)
    if (this.conflictMetrics.blamePatternCount >= 3 && conflictLevel >= 4) {
      return { shouldIntervene: true, type: 'pattern_interrupt' }
    }

    // Prolonged moderate conflict (5+ minutes above level 3)
    const conflictDuration = now - this.conflictMetrics.sessionStartTime
    if (conflictLevel >= 3 && conflictDuration > 300000) { // 5 minutes
      return { shouldIntervene: true, type: 'prolonged_conflict' }
    }

    return { shouldIntervene: false }
  }

  /**
   * Generate Emma's intervention response
   */
  private generateEmmaIntervention(
    type: EmmaInterventionTrigger,
    message: CoupleVoiceMessage
  ): string {
    this.conflictMetrics.lastInterventionTime = Date.now()

    const interventions: Record<EmmaInterventionTrigger, string[]> = {
      crisis: [
        "I'm hearing some concerning language. Let's take a pause and breathe together.",
        "This sounds really intense. Would it help to step back for a moment?",
        "I'm worried about the safety of this conversation. Can we slow down?"
      ],
      escalation: [
        "I notice the tension is rising. What if we each took a deep breath?",
        "Let's pause here. I hear both of you feeling strongly about this.",
        "This feels heated. Can we try speaking one at a time?"
      ],
      gottman_horsemen: [
        "I heard some language that might shut down connection. Can we try 'I feel' instead?",
        "That sounded like criticism. What's the specific behavior that's bothering you?",
        "Let's focus on the issue, not personal character. What exactly happened?"
      ],
      pattern_interrupt: [
        "I'm noticing a pattern here. What if we tried a different approach?",
        "You both seem stuck in a cycle. Can we pause and reset?",
        "Let's try something new. What does each person need right now?"
      ],
      prolonged_conflict: [
        "We've been on this topic for a while. What's the most important thing to resolve?",
        "This feels like we're going in circles. What would help move forward?",
        "You both care deeply about this. What's one small step toward understanding?"
      ]
    }

    const options = interventions[type]
    const selectedIntervention = options[Math.floor(Math.random() * options.length)]

    // Add personalized context based on recent messages
    const recentSpeaker = message.speaker
    
    // Only add Gottman techniques if message is from a partner (not Emma)
    if (recentSpeaker !== 'emma') {
      const partnerSpeaker: Speaker = recentSpeaker === 'A' ? 'B' : 'A'
      
      // Add Gottman Method techniques
      const gottmanTechniques = [
        `${this.getSpeakerName(recentSpeaker)}, can you tell ${this.getSpeakerName(partnerSpeaker)} what you need instead of what they did wrong?`,
        `${this.getSpeakerName(partnerSpeaker)}, can you reflect back what you heard before responding?`,
        "Let's try the speaker-listener technique. One person speaks, the other just listens.",
        "What's the underlying need behind this conflict? Let's explore that together."
      ]

      // 30% chance to add a Gottman technique
      if (Math.random() < 0.3) {
        const technique = gottmanTechniques[Math.floor(Math.random() * gottmanTechniques.length)]
        return `${selectedIntervention} ${technique}`
      }
    }

    return selectedIntervention
  }

  /**
   * Detect crisis keywords requiring immediate intervention
   */
  private detectCrisisKeywords(text: string): boolean {
    const crisisKeywords = [
      'red pineapple', // Safe word from spec
      'hurt you', 'hit you', 'kill', 'hate you',
      'done with this', 'can\'t do this anymore',
      'leaving', 'divorce', 'over'
    ]

    return crisisKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    )
  }

  /**
   * Update conflict metrics
   */
  private updateConflictMetrics(conflictLevel: number, hasBlamePattern: boolean): void {
    const previousLevel = this.conflictMetrics.currentLevel
    this.conflictMetrics.currentLevel = conflictLevel

    // Update escalation trend
    if (conflictLevel > previousLevel + 1) {
      this.conflictMetrics.escalationTrend = 'escalating'
    } else if (conflictLevel < previousLevel - 1) {
      this.conflictMetrics.escalationTrend = 'de-escalating'
    } else {
      this.conflictMetrics.escalationTrend = 'stable'
    }

    // Update blame pattern count
    if (hasBlamePattern) {
      this.conflictMetrics.blamePatternCount++
    }
  }

  /**
   * Count speaker switches in recent history
   */
  private countSpeakerSwitches(messages: CoupleVoiceMessage[]): number {
    if (messages.length < 2) return 0

    let switches = 0
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].speaker !== messages[i-1].speaker) {
        switches++
      }
    }
    return switches
  }

  /**
   * Get display name for speaker
   */
  private getSpeakerName(speaker: Speaker): string {
    return speaker === 'A' ? 'Partner A' : 'Partner B'
  }

  /**
   * Get current conflict metrics for monitoring
   */
  getConflictMetrics(): ConflictMetrics {
    return { ...this.conflictMetrics }
  }

  /**
   * Reset session for new conversation
   */
  resetSession(): void {
    this.conflictMetrics = {
      currentLevel: 0,
      escalationTrend: 'stable',
      blamePatternCount: 0,
      interruptionCount: 0,
      lastInterventionTime: 0,
      sessionStartTime: Date.now()
    }
    this.conversationHistory = []
    console.log('🧘‍♀️ Emma conflict intervention session reset')
  }

  /**
   * Generate couple-specific Emma system prompt
   */
  generateCoupleSystemPrompt(conversationState: CoupleConversationState): string {
    const { messages, currentSpeaker, conflictLevel } = conversationState
    const recentMessages = messages.slice(-6) // Last 3 from each speaker

    const partnerAMessages = recentMessages
      .filter(msg => msg.speaker === 'A')
      .map(msg => msg.text)
      .slice(-3)

    const partnerBMessages = recentMessages
      .filter(msg => msg.speaker === 'B')
      .map(msg => msg.text)
      .slice(-3)

    return `You are Emma, a real-time relationship coach facilitating a couple's conversation.

Current state:
- Partner A (last 3 messages): ${partnerAMessages.join(' | ')}
- Partner B (last 3 messages): ${partnerBMessages.join(' | ')}
- Conflict level: ${conflictLevel}/10
- Last speaker: Partner ${currentSpeaker}
- Session duration: ${Math.round((Date.now() - this.conflictMetrics.sessionStartTime) / 60000)} minutes

Provide a brief intervention (max 60 chars) that:
1. Acknowledges both perspectives
2. Teaches ONE specific skill
3. De-escalates tension
4. Uses Gottman Method principles

Be warm but direct. Focus on immediate actionable guidance.

Gottman Method techniques to prioritize:
- Replace criticism with specific requests
- Address contempt with appreciation
- Transform defensiveness into responsibility
- Break stonewalling with engagement

If conflict level >7, prioritize de-escalation over teaching.`
  }
}

// Types for conflict detection
interface BlamePattern {
  type: 'criticism' | 'contempt' | 'defensiveness' | 'stonewalling'
  severity: 'low' | 'medium' | 'high' | 'critical'
  matched: string
  gottmanCategory: 'criticism' | 'contempt' | 'defensiveness' | 'stonewalling'
}

// Singleton instance for app-wide use
export const conflictInterventionService = new ConflictInterventionService()