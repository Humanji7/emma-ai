/**
 * Emma AI Monitoring System
 * Real-time monitoring and alerting for AI interactions
 * QA Persona - Comprehensive coverage with risk-based prioritization
 */

import { QualityGateSystem, type ValidationResult, type QualityMetrics } from './quality-gates'
import type { 
  SafetyValidatedResponse, 
  CrisisDetectionResult, 
  EmotionData,
  ConversationTurn 
} from '@/types'

export interface MonitoringEvent {
  id: string
  timestamp: Date
  type: 'interaction' | 'crisis' | 'error' | 'warning'
  severity: 'low' | 'medium' | 'high' | 'critical'
  data: any
  userId?: string
  sessionId?: string
}

export interface AlertRule {
  id: string
  name: string
  condition: (event: MonitoringEvent) => boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: 'log' | 'notify' | 'escalate' | 'block'
  description: string
}

export class EmmaMonitor {
  private qualityGates = new QualityGateSystem()
  private events: MonitoringEvent[] = []
  private alertRules: AlertRule[] = []
  private activeAlerts = new Set<string>()
  
  constructor() {
    this.setupDefaultAlertRules()
  }
  
  /**
   * Monitor complete interaction flow
   */
  async monitorInteraction(
    userInput: string,
    response: SafetyValidatedResponse<string>,
    crisisResult: CrisisDetectionResult,
    emotion?: EmotionData,
    metadata?: { userId?: string, sessionId?: string }
  ): Promise<{
    passed: boolean
    validationResults: ValidationResult[]
    alerts: MonitoringEvent[]
    recommendations: string[]
  }> {
    const sessionId = metadata?.sessionId || this.generateSessionId()
    const validationResults: ValidationResult[] = []
    const alerts: MonitoringEvent[] = []
    const allRecommendations: string[] = []
    
    // Gate 1: Input validation
    const inputValidation = await this.qualityGates.validateInput(userInput, emotion)
    validationResults.push(inputValidation)
    
    if (!inputValidation.passed) {
      const alert = this.createAlert('warning', 'Input validation failed', {
        gate: 'input',
        issues: inputValidation.issues,
        userInput: userInput.substring(0, 100) + '...'
      }, metadata)
      alerts.push(alert)
    }
    
    allRecommendations.push(...inputValidation.recommendations)
    
    // Gate 2: Response quality assessment  
    const responseValidation = await this.qualityGates.validateResponse(
      response, 
      userInput, 
      crisisResult
    )
    validationResults.push(responseValidation)
    
    if (!responseValidation.passed || responseValidation.score < 0.6) {
      const alert = this.createAlert(
        responseValidation.score < 0.3 ? 'critical' : 'medium',
        'Response quality issues detected',
        {
          gate: 'response-quality',
          score: responseValidation.score,
          issues: responseValidation.issues,
          confidence: response.confidence
        },
        metadata
      )
      alerts.push(alert)
    }
    
    allRecommendations.push(...responseValidation.recommendations)
    
    // Gate 3: Crisis detection validation
    const crisisValidation = await this.qualityGates.validateCrisisDetection(
      userInput,
      crisisResult,
      emotion
    )
    validationResults.push(crisisValidation)
    
    if (!crisisValidation.passed || crisisResult.isCrisis) {
      const alert = this.createAlert(
        crisisResult.immediateAction ? 'critical' : 'high',
        crisisResult.isCrisis ? 'Crisis situation detected' : 'Crisis detection validation failed',
        {
          gate: 'crisis-detection',
          crisisDetected: crisisResult.isCrisis,
          severity: crisisResult.severity,
          triggers: crisisResult.triggers,
          escalationRequired: crisisResult.escalationRequired
        },
        metadata
      )
      alerts.push(alert)
    }
    
    allRecommendations.push(...crisisValidation.recommendations)
    
    // Gate 4: End-to-end validation
    const e2eValidation = await this.qualityGates.validateE2E(
      userInput,
      response,
      crisisResult
    )
    validationResults.push(e2eValidation)
    
    if (!e2eValidation.passed) {
      const alert = this.createAlert('medium', 'End-to-end validation issues', {
        gate: 'e2e',
        issues: e2eValidation.issues
      }, metadata)
      alerts.push(alert)
    }
    
    allRecommendations.push(...e2eValidation.recommendations)
    
    // Record interaction event
    const interactionEvent = this.createEvent('interaction', 'low', {
      userInput: userInput.substring(0, 100) + '...',
      response: response.data.substring(0, 100) + '...',
      crisisDetected: crisisResult.isCrisis,
      confidence: response.confidence,
      validationResults: validationResults.map(v => ({
        gate: v.gate,
        passed: v.passed,
        score: v.score
      }))
    }, metadata)
    
    this.events.push(interactionEvent)
    
    // Process alerts through alert rules
    for (const alert of alerts) {
      this.processAlert(alert)
    }
    
    const overallPassed = validationResults.every(v => v.passed) && alerts.length === 0
    
    return {
      passed: overallPassed,
      validationResults,
      alerts,
      recommendations: [...new Set(allRecommendations)]
    }
  }
  
  /**
   * Monitor crisis escalation workflow
   */
  async monitorCrisisEscalation(
    crisisResult: CrisisDetectionResult,
    escalationActions: string[],
    metadata?: { userId?: string, sessionId?: string }
  ): Promise<void> {
    const alert = this.createAlert('critical', 'Crisis escalation initiated', {
      severity: crisisResult.severity,
      category: crisisResult.category,
      triggers: crisisResult.triggers,
      actions: escalationActions,
      resources: crisisResult.resources.map(r => r.name)
    }, metadata)
    
    this.events.push(alert)
    this.processAlert(alert)
    
    // Special handling for immediate threats
    if (crisisResult.immediateAction) {
      await this.triggerImmediateResponse(alert)
    }
  }
  
  /**
   * Get real-time system health metrics
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical'
    metrics: {
      totalInteractions: number
      crisisDetections: number
      averageConfidence: number
      averageResponseTime: number
      validationFailureRate: number
    }
    activeAlerts: number
    recommendations: string[]
  } {
    const recentEvents = this.events.filter(
      e => Date.now() - e.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    )
    
    const interactions = recentEvents.filter(e => e.type === 'interaction')
    const crises = recentEvents.filter(e => e.type === 'crisis')
    const errors = recentEvents.filter(e => e.type === 'error')
    
    const qualityReport = this.qualityGates.getQualityReport()
    
    const validationFailures = interactions.filter(e => 
      e.data.validationResults?.some((v: any) => !v.passed)
    ).length
    
    const validationFailureRate = interactions.length > 0 ? 
      validationFailures / interactions.length : 0
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (validationFailureRate > 0.3 || errors.length > 5) {
      status = 'critical'
    } else if (validationFailureRate > 0.1 || this.activeAlerts.size > 3) {
      status = 'degraded'
    }
    
    return {
      status,
      metrics: {
        totalInteractions: interactions.length,
        crisisDetections: crises.length,
        averageConfidence: qualityReport.averageMetrics.confidence || 0,
        averageResponseTime: qualityReport.averageMetrics.responseTime || 0,
        validationFailureRate
      },
      activeAlerts: this.activeAlerts.size,
      recommendations: qualityReport.recommendations
    }
  }
  
  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'crisis-detection',
        name: 'Crisis Situation Detected',
        condition: (event) => event.type === 'crisis' || 
          (event.data?.crisisDetected && event.data?.severity === 'emergency'),
        severity: 'critical',
        action: 'escalate',
        description: 'Immediate human intervention required for crisis situation'
      },
      {
        id: 'low-confidence',
        name: 'Low AI Confidence',
        condition: (event) => event.data?.confidence < 0.5,
        severity: 'medium',
        action: 'notify',
        description: 'AI response confidence below acceptable threshold'
      },
      {
        id: 'validation-failure',
        name: 'Validation Gate Failure',
        condition: (event) => event.data?.validationResults?.some((v: any) => !v.passed),
        severity: 'high',
        action: 'notify',
        description: 'One or more quality gates failed validation'
      },
      {
        id: 'response-time',
        name: 'Slow Response Time',
        condition: (event) => event.data?.responseTime > 5000,
        severity: 'medium',
        action: 'log',
        description: 'Response time exceeded acceptable threshold'
      },
      {
        id: 'false-positive-crisis',
        name: 'Potential False Positive Crisis',
        condition: (event) => 
          event.data?.crisisDetected && 
          event.data?.emotion?.sentiment > 0.5,
        severity: 'medium',
        action: 'notify',
        description: 'Crisis detected but emotion indicates positive sentiment'
      }
    ]
  }
  
  private createAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    data: any,
    metadata?: { userId?: string, sessionId?: string }
  ): MonitoringEvent {
    return {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: severity === 'critical' ? 'crisis' : 'warning',
      severity,
      data: { ...data, message },
      userId: metadata?.userId,
      sessionId: metadata?.sessionId
    }
  }
  
  private createEvent(
    type: 'interaction' | 'crisis' | 'error' | 'warning',
    severity: 'low' | 'medium' | 'high' | 'critical',
    data: any,
    metadata?: { userId?: string, sessionId?: string }
  ): MonitoringEvent {
    return {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      severity,
      data,
      userId: metadata?.userId,
      sessionId: metadata?.sessionId
    }
  }
  
  private processAlert(alert: MonitoringEvent): void {
    // Apply alert rules
    for (const rule of this.alertRules) {
      if (rule.condition(alert)) {
        this.executeAlertAction(rule, alert)
        break
      }
    }
  }
  
  private executeAlertAction(rule: AlertRule, alert: MonitoringEvent): void {
    switch (rule.action) {
      case 'log':
        console.log(`[${rule.severity.toUpperCase()}] ${rule.name}:`, alert.data)
        break
        
      case 'notify':
        console.warn(`[ALERT] ${rule.name}:`, alert.data)
        this.activeAlerts.add(alert.id)
        break
        
      case 'escalate':
        console.error(`[CRITICAL] ${rule.name}:`, alert.data)
        this.activeAlerts.add(alert.id)
        this.escalateToHuman(alert)
        break
        
      case 'block':
        console.error(`[BLOCKED] ${rule.name}:`, alert.data)
        this.activeAlerts.add(alert.id)
        // In production, would block the response
        break
    }
  }
  
  private async triggerImmediateResponse(alert: MonitoringEvent): Promise<void> {
    // In production, would trigger:
    // 1. Human counselor notification
    // 2. Emergency service contact
    // 3. User safety check workflow
    
    console.error('[IMMEDIATE RESPONSE REQUIRED]', {
      alertId: alert.id,
      timestamp: alert.timestamp,
      data: alert.data
    })
    
    // Log to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // await this.sendToMonitoringService(alert)
    }
  }
  
  private escalateToHuman(alert: MonitoringEvent): void {
    // In production, would:
    // 1. Notify on-call human counselor
    // 2. Create urgent ticket in support system  
    // 3. Prepare context for human takeover
    
    console.error('[HUMAN ESCALATION]', {
      alertId: alert.id,
      severity: alert.severity,
      type: alert.type,
      sessionId: alert.sessionId,
      timestamp: alert.timestamp
    })
  }
  
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  // Analytics methods
  public getEventHistory(hours: number = 24): MonitoringEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.events.filter(e => e.timestamp >= cutoff)
  }
  
  public getCrisisEvents(hours: number = 24): MonitoringEvent[] {
    return this.getEventHistory(hours).filter(e => 
      e.type === 'crisis' || e.data?.crisisDetected
    )
  }
  
  public clearOldEvents(hours: number = 168): void { // Default 7 days
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    this.events = this.events.filter(e => e.timestamp >= cutoff)
  }
  
  public exportAnalytics(): {
    events: MonitoringEvent[]
    qualityReport: any
    systemHealth: any
  } {
    return {
      events: this.events,
      qualityReport: this.qualityGates.getQualityReport(),
      systemHealth: this.getSystemHealth()
    }
  }
}