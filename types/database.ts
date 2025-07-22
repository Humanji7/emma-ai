// Emma AI Database Types
// Generated from schema.sql - DO NOT EDIT MANUALLY

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          auth_id: string | null
          subscription_tier: 'free' | 'individual' | 'couples' | 'premium'
          is_anonymous: boolean
          data_retention_days: number
          analytics_opt_out: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          auth_id?: string | null
          subscription_tier?: 'free' | 'individual' | 'couples' | 'premium'
          is_anonymous?: boolean
          data_retention_days?: number
          analytics_opt_out?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          auth_id?: string | null
          subscription_tier?: 'free' | 'individual' | 'couples' | 'premium'
          is_anonymous?: boolean
          data_retention_days?: number
          analytics_opt_out?: boolean
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          session_type: 'coaching' | 'crisis' | 'practice'
          duration_seconds: number | null
          completed: boolean
          encrypted_transcript: string | null
          encryption_key_hash: string | null
          emotion_summary: Json | null
          skills_practiced: string[] | null
          coaching_effectiveness_score: number | null
          crisis_level: number
          crisis_indicators: string[] | null
          human_escalation_triggered: boolean
          response_time_ms: number | null
          api_calls_count: number
          error_count: number
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          session_type?: 'coaching' | 'crisis' | 'practice'
          duration_seconds?: number | null
          completed?: boolean
          encrypted_transcript?: string | null
          encryption_key_hash?: string | null
          emotion_summary?: Json | null
          skills_practiced?: string[] | null
          coaching_effectiveness_score?: number | null
          crisis_level?: number
          crisis_indicators?: string[] | null
          human_escalation_triggered?: boolean
          response_time_ms?: number | null
          api_calls_count?: number
          error_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          session_type?: 'coaching' | 'crisis' | 'practice'
          duration_seconds?: number | null
          completed?: boolean
          encrypted_transcript?: string | null
          encryption_key_hash?: string | null
          emotion_summary?: Json | null
          skills_practiced?: string[] | null
          coaching_effectiveness_score?: number | null
          crisis_level?: number
          crisis_indicators?: string[] | null
          human_escalation_triggered?: boolean
          response_time_ms?: number | null
          api_calls_count?: number
          error_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      crisis_events: {
        Row: {
          id: string
          session_id: string
          created_at: string
          crisis_type: 'domestic_violence' | 'suicide_risk' | 'child_safety' | 'substance_abuse' | 'mental_health_emergency'
          severity_level: number
          confidence_score: number | null
          detection_method: 'ml_model' | 'rule_based' | 'human_reported' | null
          model_version: string | null
          trigger_phrases: string[] | null
          escalation_status: 'pending' | 'in_progress' | 'resolved' | 'false_positive'
          human_counselor_id: string | null
          response_time_seconds: number | null
          resolution_notes: string | null
        }
        Insert: {
          id?: string
          session_id: string
          created_at?: string
          crisis_type: 'domestic_violence' | 'suicide_risk' | 'child_safety' | 'substance_abuse' | 'mental_health_emergency'
          severity_level: number
          confidence_score?: number | null
          detection_method?: 'ml_model' | 'rule_based' | 'human_reported' | null
          model_version?: string | null
          trigger_phrases?: string[] | null
          escalation_status?: 'pending' | 'in_progress' | 'resolved' | 'false_positive'
          human_counselor_id?: string | null
          response_time_seconds?: number | null
          resolution_notes?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          created_at?: string
          crisis_type?: 'domestic_violence' | 'suicide_risk' | 'child_safety' | 'substance_abuse' | 'mental_health_emergency'
          severity_level?: number
          confidence_score?: number | null
          detection_method?: 'ml_model' | 'rule_based' | 'human_reported' | null
          model_version?: string | null
          trigger_phrases?: string[] | null
          escalation_status?: 'pending' | 'in_progress' | 'resolved' | 'false_positive'
          human_counselor_id?: string | null
          response_time_seconds?: number | null
          resolution_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crisis_events_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      analytics_sessions: {
        Row: {
          id: string
          recorded_at: string
          session_date: string | null
          session_hour: number | null
          day_of_week: number | null
          session_duration_minutes: number | null
          session_type: string | null
          user_subscription_tier: string | null
          primary_emotion: string | null
          emotion_intensity_avg: number | null
          emotion_improvement: boolean | null
          skills_practiced_count: number | null
          user_satisfaction_score: number | null
          coaching_effectiveness: number | null
          voice_processing_time_ms: number | null
          response_generation_time_ms: number | null
          total_api_calls: number | null
          error_occurred: boolean | null
          country_code: string | null
          timezone: string | null
        }
        Insert: {
          id?: string
          recorded_at?: string
          session_date?: string | null
          session_hour?: number | null
          day_of_week?: number | null
          session_duration_minutes?: number | null
          session_type?: string | null
          user_subscription_tier?: string | null
          primary_emotion?: string | null
          emotion_intensity_avg?: number | null
          emotion_improvement?: boolean | null
          skills_practiced_count?: number | null
          user_satisfaction_score?: number | null
          coaching_effectiveness?: number | null
          voice_processing_time_ms?: number | null
          response_generation_time_ms?: number | null
          total_api_calls?: number | null
          error_occurred?: boolean | null
          country_code?: string | null
          timezone?: string | null
        }
        Update: {
          id?: string
          recorded_at?: string
          session_date?: string | null
          session_hour?: number | null
          day_of_week?: number | null
          session_duration_minutes?: number | null
          session_type?: string | null
          user_subscription_tier?: string | null
          primary_emotion?: string | null
          emotion_intensity_avg?: number | null
          emotion_improvement?: boolean | null
          skills_practiced_count?: number | null
          user_satisfaction_score?: number | null
          coaching_effectiveness?: number | null
          voice_processing_time_ms?: number | null
          response_generation_time_ms?: number | null
          total_api_calls?: number | null
          error_occurred?: boolean | null
          country_code?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          id: string
          recorded_at: string
          metric_name: string
          metric_value: number
          metric_unit: string | null
          service_name: string | null
          environment: 'development' | 'staging' | 'production'
          metadata: Json | null
        }
        Insert: {
          id?: string
          recorded_at?: string
          metric_name: string
          metric_value: number
          metric_unit?: string | null
          service_name?: string | null
          environment?: 'development' | 'staging' | 'production'
          metadata?: Json | null
        }
        Update: {
          id?: string
          recorded_at?: string
          metric_name?: string
          metric_value?: number
          metric_unit?: string | null
          service_name?: string | null
          environment?: 'development' | 'staging' | 'production'
          metadata?: Json | null
        }
        Relationships: []
      }
      coaching_templates: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          template_name: string
          category: string
          skill_focus: string
          template_text: string
          follow_up_questions: string[] | null
          practice_exercises: string[] | null
          usage_count: number
          effectiveness_rating: number
          clinical_review_status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          review_notes: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          template_name: string
          category: string
          skill_focus: string
          template_text: string
          follow_up_questions?: string[] | null
          practice_exercises?: string[] | null
          usage_count?: number
          effectiveness_rating?: number
          clinical_review_status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          review_notes?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          template_name?: string
          category?: string
          skill_focus?: string
          template_text?: string
          follow_up_questions?: string[] | null
          practice_exercises?: string[] | null
          usage_count?: number
          effectiveness_rating?: number
          clinical_review_status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          review_notes?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      relationship_goals: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          goal_category: string
          goal_description: string
          target_completion_date: string | null
          current_progress: number
          milestones_completed: number
          total_milestones: number | null
          status: 'active' | 'completed' | 'paused' | 'abandoned'
          completion_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          goal_category: string
          goal_description: string
          target_completion_date?: string | null
          current_progress?: number
          milestones_completed?: number
          total_milestones?: number | null
          status?: 'active' | 'completed' | 'paused' | 'abandoned'
          completion_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          goal_category?: string
          goal_description?: string
          target_completion_date?: string | null
          current_progress?: number
          milestones_completed?: number
          total_milestones?: number | null
          status?: 'active' | 'completed' | 'paused' | 'abandoned'
          completion_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_goals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      system_config: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          config_key: string
          config_value: Json
          config_type: 'feature_flag' | 'setting' | 'limit' | 'threshold'
          environment: 'development' | 'staging' | 'production'
          description: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          config_key: string
          config_value: Json
          config_type: 'feature_flag' | 'setting' | 'limit' | 'threshold'
          environment?: 'development' | 'staging' | 'production'
          description?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          config_key?: string
          config_value?: Json
          config_type?: 'feature_flag' | 'setting' | 'limit' | 'threshold'
          environment?: 'development' | 'staging' | 'production'
          description?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_data: {
        Args: {}
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for common operations
export type UserProfile = Database['public']['Tables']['users']['Row']
export type NewUser = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Session = Database['public']['Tables']['sessions']['Row']
export type NewSession = Database['public']['Tables']['sessions']['Insert']
export type SessionUpdate = Database['public']['Tables']['sessions']['Update']

export type CrisisEvent = Database['public']['Tables']['crisis_events']['Row']
export type NewCrisisEvent = Database['public']['Tables']['crisis_events']['Insert']

export type CoachingTemplate = Database['public']['Tables']['coaching_templates']['Row']
export type NewCoachingTemplate = Database['public']['Tables']['coaching_templates']['Insert']

export type RelationshipGoal = Database['public']['Tables']['relationship_goals']['Row']
export type NewRelationshipGoal = Database['public']['Tables']['relationship_goals']['Insert']

export type SystemConfig = Database['public']['Tables']['system_config']['Row']
export type SystemMetric = Database['public']['Tables']['system_metrics']['Row']
export type NewSystemMetric = Database['public']['Tables']['system_metrics']['Insert']

// Emotion data structure
export interface EmotionSummary {
  dominant: string
  intensity: number // 0-1
  progression: Array<{
    timestamp: number
    emotion: string
    intensity: number
  }>
  confidence: number // 0-1
}

// Crisis detection result
export interface DatabaseCrisisDetectionResult {
  level: number // 0-3
  type: CrisisEvent['crisis_type'] | null
  confidence: number // 0-1
  indicators: string[]
  requiresHumanEscalation: boolean
  recommendedResponse: string
}

// Voice processing metrics
export interface VoiceMetrics {
  processingTime: number // ms
  transcriptionAccuracy: number // 0-1
  audioQuality: number // 0-1
  backgroundNoise: number // 0-1
}

// Coaching effectiveness tracking
export interface CoachingEffectiveness {
  responseRelevance: number // 0-1
  emotionalSupport: number // 0-1
  skillApplication: number // 0-1
  userSatisfaction: number // 0-1
  overallScore: number // 0-1
}

// System health status
export interface SystemHealth {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number // ms
  errorRate: number // 0-1
  lastChecked: string
  details?: Record<string, any>
}