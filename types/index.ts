// Emma AI Core Types - Safety-First Design

// Voice-related types
export type VoiceRecorderState = 'idle' | 'requesting-permission' | 'listening' | 'processing'
export type AudioLevel = number // 0-1 range for audio visualization

export interface VoiceMessage {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'user' | 'emma';
  audioUrl?: string;
  emotion?: EmotionData;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration?: number;
  segments?: TranscriptionSegment[];
  crisisDetected: boolean;
  requiresHumanReview: boolean;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
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
  category: 'domestic_violence' | 'mental_health' | 'substance_abuse' | 'child_safety' | 'none';
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