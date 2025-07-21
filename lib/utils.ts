import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate unique ID for components
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate audio support in browser
 */
export function getAudioSupport() {
  if (!isBrowser()) return { supported: false, features: [] }
  
  const features = []
  
  if (typeof MediaRecorder !== 'undefined') {
    features.push('recording')
  }
  
  if (navigator.mediaDevices?.getUserMedia) {
    features.push('microphone-access')
  }
  
  if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
    features.push('audio-analysis')
  }
  
  return {
    supported: features.length > 0,
    features
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Emma AI specific utilities
 */
export const emmaUtils = {
  /**
   * Sanitize user input for safety
   */
  sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .substring(0, 1000) // Limit length
  },
  
  /**
   * Check if text indicates potential crisis
   */
  hasEmergencyKeywords(text: string): boolean {
    const emergencyKeywords = [
      'suicide', 'kill myself', 'end it all', 'hurt myself',
      'self-harm', 'overdose', 'jump', 'cut myself'
    ]
    
    const lowerText = text.toLowerCase()
    return emergencyKeywords.some(keyword => lowerText.includes(keyword))
  },
  
  /**
   * Extract emotion indicators from text
   */
  detectEmotionalTone(text: string): 'positive' | 'negative' | 'neutral' | 'crisis' {
    const positiveWords = ['happy', 'joy', 'love', 'excited', 'grateful', 'better']
    const negativeWords = ['sad', 'angry', 'frustrated', 'hopeless', 'lonely', 'depressed']
    const crisisWords = ['suicide', 'kill', 'hurt', 'end', 'die']
    
    const lowerText = text.toLowerCase()
    
    if (crisisWords.some(word => lowerText.includes(word))) {
      return 'crisis'
    }
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }
}