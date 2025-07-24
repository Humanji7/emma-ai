import { useMicVAD } from '@ricky0123/vad-react';
// @ts-ignore - pitchy doesn't have perfect TypeScript support
import { PitchDetector } from 'pitchy';
import type { 
  Speaker, 
  VADResult, 
  PitchAnalysis, 
  SpeakerSegment, 
  CoupleAudioState,
  SpeakerDetectionMode 
} from '@/types';

/**
 * VoiceActivityDetectionService - Multi-speaker voice detection for couple sessions
 * 
 * Features:
 * - Voice Activity Detection (VAD) using @ricky0123/vad-react
 * - Pitch-based speaker differentiation using pitchy
 * - Pause-based speaker switching (400ms threshold)
 * - Manual fallback mode
 * - Speaker calibration system
 */
export class VoiceActivityDetectionService {
  private speakerProfiles: Map<Speaker, SpeakerProfile> = new Map();
  private lastSpeechTime: number = 0;
  private pauseThreshold: number = 400; // ms
  private confidenceThreshold: number = 0.6;
  private pitchDetector: any | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private lastActiveSpeaker: Speaker = 'A'; // Track the last active speaker

  constructor(
    pauseThreshold: number = 400,
    confidenceThreshold: number = 0.6
  ) {
    this.pauseThreshold = pauseThreshold;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Initialize the VAD service with audio context
   */
  async initialize(audioContext: AudioContext, analyser: AnalyserNode): Promise<void> {
    this.audioContext = audioContext;
    this.analyser = analyser;
    
    try {
      // Initialize pitch detector
      this.pitchDetector = (PitchDetector as any).forFloat32Array(analyser.fftSize);
      console.log('🎵 VAD Service initialized with pitch detection');
    } catch (error) {
      console.warn('⚠️ Pitch detection initialization failed, using VAD only:', error);
    }
  }

  /**
   * Calibrate speaker voices with sample audio
   */
  async calibrateSpeakers(
    sampleA: AudioBuffer, 
    sampleB: AudioBuffer
  ): Promise<boolean> {
    try {
      const profileA = await this.extractSpeakerProfile(sampleA, 'A');
      const profileB = await this.extractSpeakerProfile(sampleB, 'B');

      this.speakerProfiles.set('A', profileA);
      this.speakerProfiles.set('B', profileB);

      console.log('🎤 Speaker calibration completed:', {
        speakerA: profileA,
        speakerB: profileB
      });

      return true;
    } catch (error) {
      console.error('❌ Speaker calibration failed:', error);
      return false;
    }
  }

  /**
   * Main speaker detection function
   */
  detectSpeaker(
    audioData: Float32Array,
    mode: SpeakerDetectionMode = 'hybrid'
  ): VADResult {
    const timestamp = Date.now();
    
    // Basic VAD - is there speech?
    const speechDetected = this.detectVoiceActivity(audioData);
    
    if (!speechDetected.isSpeech) {
      return {
        isSpeech: false,
        confidence: speechDetected.confidence,
        timestamp
      };
    }

    // Determine speaker based on mode
    let detectedSpeaker: Speaker | undefined;
    let confidence = speechDetected.confidence;

    switch (mode) {
      case 'manual':
        // Manual mode - speaker determined externally
        break;
        
      case 'vad':
        // VAD + pause detection only
        detectedSpeaker = this.detectSpeakerByPause();
        break;
        
      case 'pitch':
        // Pitch-based detection
        if (this.pitchDetector && this.speakerProfiles.size === 2) {
          const pitchResult = this.detectSpeakerByPitch(audioData);
          detectedSpeaker = pitchResult.speaker;
          confidence = Math.min(confidence, pitchResult.confidence);
        }
        break;
        
      case 'hybrid':
        // Combine VAD + pitch + pause detection
        detectedSpeaker = this.detectSpeakerHybrid(audioData);
        break;
    }

    this.lastSpeechTime = timestamp;

    return {
      isSpeech: true,
      confidence,
      speaker: detectedSpeaker,
      timestamp
    };
  }

  /**
   * Basic voice activity detection
   */
  private detectVoiceActivity(audioData: Float32Array): { isSpeech: boolean; confidence: number } {
    // Calculate RMS (Root Mean Square) for audio level
    let rms = 0;
    for (let i = 0; i < audioData.length; i++) {
      rms += audioData[i] * audioData[i];
    }
    rms = Math.sqrt(rms / audioData.length);

    // Simple threshold-based VAD
    const threshold = 0.01; // Adjustable threshold
    const isSpeech = rms > threshold;
    const confidence = Math.min(rms / threshold, 1.0);

    return { isSpeech, confidence };
  }

  /**
   * Detect speaker based on pause duration
   */
  private detectSpeakerByPause(): Speaker | undefined {
    const timeSinceLastSpeech = Date.now() - this.lastSpeechTime;
    
    // If pause > threshold, assume speaker switched
    if (timeSinceLastSpeech > this.pauseThreshold) {
      // Simple alternation - switch to the other speaker
      const lastSpeaker = this.getLastActiveSpeaker();
      const newSpeaker = lastSpeaker === 'A' ? 'B' : 'A';
      console.log(`🔄 Pause-based switch: ${lastSpeaker} → ${newSpeaker} (pause: ${timeSinceLastSpeech}ms)`);
      return newSpeaker;
    }
    
    // Continue with current speaker if no pause
    return this.getLastActiveSpeaker();
  }

  /**
   * Detect speaker by pitch analysis
   */
  private detectSpeakerByPitch(audioData: Float32Array): { speaker?: Speaker; confidence: number } {
    if (!this.pitchDetector || this.speakerProfiles.size !== 2) {
      return { confidence: 0 };
    }

    try {
      const [frequency, clarity] = this.pitchDetector.findPitch(audioData, this.audioContext!.sampleRate);
      
      if (clarity < 0.5) {
        return { confidence: 0 };
      }

      // Compare with calibrated profiles
      let bestMatch: Speaker | undefined;
      let bestScore = 0;

      for (const [speaker, profile] of this.speakerProfiles) {
        const pitchDiff = Math.abs(frequency - profile.avgPitch);
        const score = Math.max(0, 1 - (pitchDiff / profile.pitchRange));
        
        if (score > bestScore && score > this.confidenceThreshold) {
          bestScore = score;
          bestMatch = speaker;
        }
      }

      return {
        speaker: bestMatch,
        confidence: bestScore
      };
    } catch (error) {
      console.warn('⚠️ Pitch detection error:', error);
      return { confidence: 0 };
    }
  }

  /**
   * Hybrid detection combining multiple methods
   */
  private detectSpeakerHybrid(audioData: Float32Array): Speaker | undefined {
    // Try pitch detection first (most accurate when available)
    if (this.speakerProfiles.size === 2) {
      const pitchResult = this.detectSpeakerByPitch(audioData);
      if (pitchResult.speaker && pitchResult.confidence > 0.7) {
        return pitchResult.speaker;
      }
    }

    // Fallback to pause-based detection
    return this.detectSpeakerByPause();
  }

  /**
   * Extract speaker profile from audio sample
   */
  private async extractSpeakerProfile(audioBuffer: AudioBuffer, speaker: Speaker): Promise<SpeakerProfile> {
    const audioData = audioBuffer.getChannelData(0);
    let pitchSum = 0;
    let pitchCount = 0;
    let minPitch = Infinity;
    let maxPitch = 0;

    if (this.pitchDetector) {
      // Analyze pitch across the sample
      const windowSize = 1024;
      for (let i = 0; i < audioData.length - windowSize; i += windowSize) {
        const window = audioData.slice(i, i + windowSize);
        try {
          const [frequency, clarity] = this.pitchDetector.findPitch(window, audioBuffer.sampleRate);
          
          if (clarity > 0.5 && frequency > 50 && frequency < 500) {
            pitchSum += frequency;
            pitchCount++;
            minPitch = Math.min(minPitch, frequency);
            maxPitch = Math.max(maxPitch, frequency);
          }
        } catch (e) {
          // Skip invalid windows
        }
      }
    }

    const avgPitch = pitchCount > 0 ? pitchSum / pitchCount : 150; // Default fallback
    const pitchRange = pitchCount > 0 ? maxPitch - minPitch : 50; // Default range

    return {
      speaker,
      avgPitch,
      pitchRange,
      minPitch: minPitch === Infinity ? avgPitch - 25 : minPitch,
      maxPitch: maxPitch === 0 ? avgPitch + 25 : maxPitch,
      confidence: pitchCount > 10 ? 0.8 : 0.3 // Based on sample quality
    };
  }

  /**
   * Get the last active speaker
   */
  private getLastActiveSpeaker(): Speaker {
    return this.lastActiveSpeaker;
  }

  /**
   * Set the current active speaker (called externally when speaker is determined)
   */
  setActiveSpeaker(speaker: Speaker): void {
    this.lastActiveSpeaker = speaker;
    console.log(`🎤 Active speaker set to: ${speaker}`);
  }

  /**
   * Update pause threshold dynamically
   */
  setPauseThreshold(ms: number): void {
    this.pauseThreshold = Math.max(100, Math.min(2000, ms)); // Clamp between 100ms-2s
    console.log(`🎤 Pause threshold updated to ${this.pauseThreshold}ms`);
  }

  /**
   * Update confidence threshold
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0.1, Math.min(0.9, threshold)); // Clamp 0.1-0.9
    console.log(`🎤 Confidence threshold updated to ${this.confidenceThreshold}`);
  }

  /**
   * Get current speaker profiles for debugging
   */
  getSpeakerProfiles(): Map<Speaker, SpeakerProfile> {
    return new Map(this.speakerProfiles);
  }

  /**
   * Reset calibration
   */
  resetCalibration(): void {
    this.speakerProfiles.clear();
    this.lastActiveSpeaker = 'A'; // Reset to default
    console.log('🎤 Speaker calibration reset');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.speakerProfiles.clear();
    this.pitchDetector = null;
    this.audioContext = null;
    this.analyser = null;
    this.lastActiveSpeaker = 'A'; // Reset to default
    console.log('🎤 VAD Service cleaned up');
  }
}

interface SpeakerProfile {
  speaker: Speaker;
  avgPitch: number;
  pitchRange: number;
  minPitch: number;
  maxPitch: number;
  confidence: number;
}

// Singleton instance for app-wide use
export const vadService = new VoiceActivityDetectionService();

// React hook for easy integration
export function useVADService(
  pauseThreshold: number = 400,
  confidenceThreshold: number = 0.6
) {
  const service = new VoiceActivityDetectionService(pauseThreshold, confidenceThreshold);
  
  return {
    vadService: service,
    detectSpeaker: service.detectSpeaker.bind(service),
    calibrateSpeakers: service.calibrateSpeakers.bind(service),
    setPauseThreshold: service.setPauseThreshold.bind(service),
    setConfidenceThreshold: service.setConfidenceThreshold.bind(service),
    cleanup: service.cleanup.bind(service)
  };
}