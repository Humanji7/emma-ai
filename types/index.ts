// Emma AI Core Types - Safety-First Design

// Voice-related types
export type VoiceRecorderState = 'idle' | 'requesting-permission' | 'listening' | 'processing'
export type AudioLevel = number // 0-1 range for audio visualization
export type Speaker = 'A' | 'B' // For couple mode
export type SpeakerDetectionMode = 'manual' | 'vad' | 'pitch' | 'hybrid'

export interface VoiceMessage {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'user' | 'emma' | 'A' | 'B'; // Extended for couple mode
  audioUrl?: string;
  emotion?: EmotionData;
}

// Couple Session Types
export interface CoupleVoiceMessage extends Omit<VoiceMessage, 'speaker'> {
  speaker: 'A' | 'B' | 'emma';
  conflictLevel?: number; // 0-10 scale
  emotionalTone?: 'calm' | 'frustrated' | 'angry' | 'defensive' | 'sad';
}

// Voice Manager State
export interface VoiceManagerState {
  isInitialized: boolean
  isCalibrated: boolean
  currentProfile?: any // CoupleProfile from service
  isRecording: boolean
  currentSpeaker: Speaker | 'silence'
  accuracy: number
  detectionConfidence: number
}

export interface CoupleAudioState {
  currentSpeaker: Speaker | 'silence';
  speakerHistory: SpeakerSegment[];
  audioLevelA: AudioLevel;
  audioLevelB: AudioLevel;
  vadEnabled: boolean;
  manualMode: boolean;
  detectionMode: SpeakerDetectionMode;
  pauseThreshold: number; // ms for speaker switching
  confidenceThreshold: number; // 0-1 for VAD decisions
}

export interface SpeakerSegment {
  speaker: Speaker;
  startTime: number;
  endTime: number;
  confidence: number;
  audioLevel: AudioLevel;
  pitchData?: PitchAnalysis;
}

export interface PitchAnalysis {
  frequency: number; // Hz
  confidence: number; // 0-1
  clarity: number; // 0-1
}

export interface VADResult {
  isSpeech: boolean;
  confidence: number;
  speaker?: Speaker;
  timestamp: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration?: number;
  segments?: TranscriptionSegment[];
  crisisDetected: boolean;
  requiresHumanReview: boolean;
  provider?: string; // Which provider was used for transcription
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

// Voice Processing Error Types
export class VoiceProcessingError extends Error {
  code: string;
  isRetryable: boolean;

  constructor(message: string, code: string, isRetryable: boolean = false) {
    super(message);
    this.name = 'VoiceProcessingError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

// Crisis Detection Types
export interface CrisisLevel {
  level: 'none' | 'medium' | 'high' | 'emergency';
  confidence: number; // 0-1 scale
  triggers: string[];
  requiresEscalation: boolean;
  timestamp: Date;
}

export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: string;
  category: 'domestic_violence' | 'mental_health' | 'substance_abuse' | 'child_safety' | 'relationship_breakdown' | 'none';
  triggers: string[];
  immediateAction: boolean;
  resources: CrisisResource[];
  escalationRequired: boolean;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
  available247: boolean;
}

// Emotion Detection Types
export interface EmotionData {
  sentiment: number; // -1 to 1 (negative to positive)
  magnitude: number; // 0 to inf (intensity)
  emotions: Record<string, number>;
  confidence: number; // 0-1 scale
  timestamp: Date;
}

// Safety-Validated Response Type
export interface SafetyValidatedResponse<T> {
  data: T;
  safetyChecked: true;
  crisisDetected: boolean;
  confidence: number; // 0-1 scale
  requiresHumanReview: boolean;
  timestamp: Date;
}

// Conversation Types
export interface ConversationTurn {
  id: string;
  speaker: 'user' | 'emma';
  content: string;
  emotion?: EmotionData;
  timestamp: Date;
  audioUrl?: string;
  crisisDetected?: boolean;
}

export interface ConversationContext {
  turns: ConversationTurn[];
  sessionId: string;
  emotionHistory: EmotionData[];
  skillsPracticed: string[];
  conflictLevel: number; // 0-10 scale
  lastActivity: Date;
}

// Couple Session Conversation Types
export interface CoupleConversationTurn extends Omit<ConversationTurn, 'speaker'> {
  speaker: 'A' | 'B' | 'emma';
  conflictLevel?: number;
  interventionTriggered?: boolean;
  blamePatterns?: string[];
  emotionalEscalation?: boolean;
}

export interface CoupleConversationState {
  messages: CoupleVoiceMessage[];
  currentSpeaker: Speaker | 'silence';
  conflictLevel: number; // 0-10 scale
  sessionMode: 'single' | 'couple';
  partnerAMessages: CoupleVoiceMessage[];
  partnerBMessages: CoupleVoiceMessage[];
  emmaInterventions: CoupleVoiceMessage[];
  lastSpeakerSwitch: Date;
  totalSpeakingTimeA: number; // ms
  totalSpeakingTimeB: number; // ms
}

// Conflict Detection Types for Couples
export interface ConflictMetrics {
  currentLevel: number; // 0-10 scale
  escalationTrend: 'escalating' | 'stable' | 'de-escalating';
  blamePatternCount: number;
  interruptionCount: number;
  lastInterventionTime: number; // timestamp
  sessionStartTime: number; // timestamp
}

// Emma Intervention Types
export type EmmaInterventionTrigger = 
  | 'crisis' 
  | 'escalation' 
  | 'gottman_horsemen' 
  | 'pattern_interrupt' 
  | 'prolonged_conflict'

// Voice Processing Types
export interface VoiceSettings {
  autoPlay: boolean;
  noiseReduction: boolean;
  language: string;
  voice: string;
}

export interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number; // 0-255
  currentEmotion: EmotionData | null;
  sessionActive: boolean;
}

// Privacy-Compliant User Types (NEVER include personal identifiers)
export interface PrivacyCompliantUser {
  id: string; // Anonymous UUID only
  preferences: UserPreferences;
  subscriptionTier: 'free' | 'individual' | 'couples' | 'premium';
  usageCount: number;
  // NEVER include: name, email, phone, address, real identity
}

export interface UserPreferences {
  communicationStyle: 'direct' | 'indirect' | 'conflict_avoidant';
  culturalContext: 'individualist' | 'collectivist' | 'hierarchical';
  relationshipGoals: string[];
  preferredLanguage: string;
}

// Coaching Types
export interface CoachingResponse {
  message: string;
  skill: 'i_statements' | 'active_listening' | 'deescalation' | 'boundary_setting' | 'empathy';
  practiceExercise?: string;
  followUpQuestion?: string;
  confidence: number;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  safetyValidated: boolean;
  timestamp: Date;
}