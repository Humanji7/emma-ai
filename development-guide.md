# Emma AI: Development Standards Guide

> **Mission**: Build production-ready, ethical, and maintainable code that prioritizes user safety and relationship outcomes.

---

## 🏗️ **Architecture Principles**

### **Code Structure Standards**
```typescript
// Project Structure - Clean Architecture Pattern
emma-ai/
├── app/                     // Next.js App Router
│   ├── (auth)/             // Authentication routes
│   ├── (coaching)/         // Main coaching interface
│   ├── api/                // API routes
│   └── globals.css         // Global styles
├── components/             // Reusable UI components
│   ├── voice/              // Voice interface components
│   ├── safety/             // Crisis and safety components
│   ├── coaching/           // Coaching session components
│   └── ui/                 // Basic UI primitives
├── lib/                    // Business logic and utilities
│   ├── ai/                 // AI service integrations
│   ├── safety/             // Crisis detection and safety
│   ├── privacy/            // Encryption and privacy
│   └── utils/              // Shared utilities
├── stores/                 // State management (Zustand)
├── types/                  // TypeScript type definitions
└── tests/                  // Test suites
```

### **TypeScript Standards**
```typescript
// Strict Type Safety Configuration
interface StrictTSConfig {
  strict: true;
  noUncheckedIndexedAccess: true;
  exactOptionalPropertyTypes: true;
  noImplicitReturns: true;
  noFallthroughCasesInSwitch: true;
}

// Safety-First Type Definitions
interface SafetyValidatedResponse<T> {
  data: T;
  safetyChecked: true;
  crisisDetected: boolean;
  confidence: number; // 0-1 scale
  requiresHumanReview: boolean;
}

// Privacy-Aware Data Types
interface PrivacyCompliantUser {
  id: string; // Anonymous UUID, never tied to real identity
  preferences: UserPreferences;
  // NEVER include: name, email, phone, address, etc.
}
```

---

## 🛡️ **Safety-First Development**

### **Mandatory Safety Checks**
```typescript
// Every AI response MUST go through safety validation
async function generateCoachingResponse(
  input: string,
  context: ConversationContext
): Promise<SafetyValidatedResponse<CoachingResponse>> {
  
  // Step 1: Crisis detection (mandatory)
  const safetyCheck = await validateSafety(input, context);
  if (safetyCheck.requiresEscalation) {
    return await escalateToHuman(safetyCheck);
  }
  
  // Step 2: Confidence validation
  const confidence = calculateConfidence(input, context);
  if (confidence < MINIMUM_CONFIDENCE_THRESHOLD) {
    return await requestHumanReview(input, context);
  }
  
  // Step 3: Generate response with safety validation
  const response = await generateResponse(input, context);
  const validatedResponse = await validateResponseSafety(response);
  
  return {
    data: validatedResponse,
    safetyChecked: true,
    crisisDetected: safetyCheck.crisisDetected,
    confidence,
    requiresHumanReview: confidence < HUMAN_REVIEW_THRESHOLD
  };
}

// Configuration Constants
const MINIMUM_CONFIDENCE_THRESHOLD = 0.6;
const HUMAN_REVIEW_THRESHOLD = 0.8;
const CRISIS_RESPONSE_TIMEOUT_MS = 5000;
```

### **Error Handling Standards**
```typescript
// Graceful Degradation Pattern
class SafeErrorHandling {
  async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    errorContext: string
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      // Log error with context but no sensitive data
      logger.error(`${errorContext} failed`, {
        errorType: error.name,
        timestamp: new Date().toISOString(),
        hasUser: Boolean(error.userId), // Never log actual user ID
      });
      
      // Attempt fallback
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        // Final fallback - always provide safe response
        return this.getSafeDefaultResponse(errorContext);
      }
    }
  }
  
  private getSafeDefaultResponse(context: string): any {
    const safeResponses = {
      'voice-processing': "I'm having trouble hearing you. Could you try typing instead?",
      'ai-generation': "Let me think about that differently. What specific communication challenge would you like to work on?",
      'crisis-detection': "I want to make sure you're safe. Would you like me to connect you with a human counselor?"
    };
    
    return safeResponses[context] || "I'm here to help. What would you like to work on today?";
  }
}
```

---

## 🔒 **Privacy-First Coding**

### **Data Handling Rules**
```typescript
// Privacy-by-Design Implementation
class PrivacyFirstDataHandler {
  // Rule 1: Never store raw conversation content
  async storeConversation(conversation: ConversationTurn[]): Promise<void> {
    const anonymizedData = {
      sessionLength: conversation.length,
      emotionSummary: this.extractEmotionSummary(conversation),
      skillsPracticed: this.extractSkillsUsed(conversation),
      outcomeMetrics: this.extractOutcomes(conversation),
      timestamp: new Date().toISOString()
      // NO conversation content, user IDs, or identifying information
    };
    
    await this.database.storeAnonymizedSession(anonymizedData);
  }
  
  // Rule 2: Encryption before any network transmission
  async transmitSensitiveData(data: any): Promise<void> {
    const encrypted = await this.encryptClientSide(data);
    await this.apiCall(encrypted);
    // Original data never leaves encrypted form
  }
  
  // Rule 3: Immediate deletion capability
  async deleteAllUserData(userId: string): Promise<CompleteDeletionResult> {
    const deletionTasks = [
      this.database.deleteUserRecords(userId),
      this.cache.clearUserData(userId),
      this.analytics.anonymizeUserData(userId),
      this.backups.scheduleUserDataPurge(userId)
    ];
    
    const results = await Promise.allSettled(deletionTasks);
    return this.validateCompleteDeletion(results);
  }
}

// Encryption Standards
interface EncryptionConfig {
  algorithm: "AES-256-GCM";
  keyDerivation: "PBKDF2 with 100,000 iterations";
  saltLength: 32; // bytes
  ivLength: 16; // bytes
  tagLength: 16; // bytes
}
```

### **API Security Standards**
```typescript
// Rate Limiting and Input Validation
export class SecureAPIHandler {
  // Input validation for all endpoints
  validateInput = z.object({
    transcript: z.string().max(1000).regex(/^[a-zA-Z0-9\s.,!?'-]+$/),
    sessionId: z.string().uuid(),
    emotion: z.object({
      sentiment: z.number().min(-1).max(1),
      confidence: z.number().min(0).max(1)
    }).optional()
  });
  
  // Rate limiting by session
  async checkRateLimit(sessionId: string): Promise<boolean> {
    const requests = await this.redis.get(`rate_limit:${sessionId}`);
    if (parseInt(requests || '0') > 100) { // 100 requests per hour
      throw new Error('Rate limit exceeded');
    }
    await this.redis.incr(`rate_limit:${sessionId}`);
    await this.redis.expire(`rate_limit:${sessionId}`, 3600);
    return true;
  }
  
  // Sanitize all outputs
  sanitizeOutput(response: any): any {
    return {
      ...response,
      // Remove any system information
      debug: undefined,
      internal: undefined,
      // Ensure no sensitive data leaks
      userId: undefined,
      realName: undefined
    };
  }
}
```

---

## 🧪 **Testing Standards**

### **Safety Testing Requirements**
```typescript
// Crisis Detection Test Suite
describe('Crisis Detection System', () => {
  const testCases = [
    // Domestic Violence Tests
    { input: "He hit me last night", expected: "emergency", confidence: 0.95 },
    { input: "Controls everything I do", expected: "high", confidence: 0.85 },
    
    // Mental Health Crisis Tests  
    { input: "I want to kill myself", expected: "emergency", confidence: 0.98 },
    { input: "Feel hopeless every day", expected: "high", confidence: 0.75 },
    
    // Child Safety Tests
    { input: "Hurts my child when angry", expected: "emergency", confidence: 0.96 },
    
    // False Positive Tests
    { input: "Love my partner so much", expected: "none", confidence: 0.05 },
    { input: "Had a fight but we're ok", expected: "none", confidence: 0.15 }
  ];
  
  test.each(testCases)('should detect $expected crisis for: $input', 
    async ({ input, expected, confidence }) => {
      const result = await crisisDetection.analyze(input);
      expect(result.level).toBe(expected);
      expect(result.confidence).toBeGreaterThan(confidence);
    }
  );
  
  test('should respond within 100ms for crisis detection', async () => {
    const start = performance.now();
    await crisisDetection.analyze("This is a test input");
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

### **Privacy Testing Requirements**
```typescript
// Privacy Protection Test Suite
describe('Privacy Protection', () => {
  test('should never store raw conversation content', async () => {
    const conversation = [
      { speaker: 'user', content: 'Personal details about my relationship' }
    ];
    
    await dataHandler.storeConversation(conversation);
    
    // Verify no raw content is stored
    const stored = await database.getLastStoredSession();
    expect(stored.content).toBeUndefined();
    expect(stored.transcript).toBeUndefined();
    expect(stored.personalDetails).toBeUndefined();
  });
  
  test('should encrypt all sensitive data before transmission', async () => {
    const sensitiveData = { emotion: 'sad', context: 'relationship issue' };
    const networkSpy = jest.spyOn(network, 'transmit');
    
    await apiHandler.sendData(sensitiveData);
    
    // Verify transmitted data is encrypted
    const transmittedData = networkSpy.mock.calls[0][0];
    expect(transmittedData.encrypted).toBe(true);
    expect(transmittedData.content).not.toContain('sad');
  });
  
  test('should completely delete user data on request', async () => {
    const userId = 'test-user-123';
    await createTestUserData(userId);
    
    const result = await dataHandler.deleteAllUserData(userId);
    
    expect(result.complete).toBe(true);
    expect(result.remainingReferences).toBe(0);
  });
});
```

---

## ⚡ **Performance Standards**

### **Response Time Requirements**
```typescript
interface PerformanceTargets {
  voiceProcessing: 2000; // ms - Audio to transcript
  responseGeneration: 1000; // ms - Coaching response
  crisisDetection: 100; // ms - Safety assessment
  textToSpeech: 500; // ms - Response audio generation
  totalLatency: 4000; // ms - End-to-end user experience
}

// Performance Monitoring
class PerformanceTracker {
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      // Log performance metrics
      this.logMetric(operationName, duration);
      
      // Alert if exceeding targets
      if (duration > PerformanceTargets[operationName]) {
        this.alertSlowOperation(operationName, duration);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.logError(operationName, duration, error);
      throw error;
    }
  }
}
```

### **Caching Strategy**
```typescript
// Intelligent Caching System
class CacheManager {
  private voiceCache = new Map<string, CachedResult>();
  private responseCache = new Map<string, CachedResponse>();
  
  // Cache voice processing results (5 min TTL)
  async cacheVoiceResult(audioHash: string, result: any): Promise<void> {
    if (this.voiceCache.size > 100) {
      this.cleanupExpiredEntries(this.voiceCache);
    }
    
    this.voiceCache.set(audioHash, {
      result,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000 // 5 minutes
    });
  }
  
  // Cache common coaching responses (1 hour TTL)
  async cacheCoachingResponse(pattern: string, response: string): Promise<void> {
    const cacheKey = this.generateCacheKey(pattern);
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      ttl: 60 * 60 * 1000 // 1 hour
    });
  }
  
  private cleanupExpiredEntries<T extends { timestamp: number; ttl: number }>(
    cache: Map<string, T>
  ): void {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        cache.delete(key);
      }
    }
  }
}
```

---

## 📝 **Code Review Standards**

### **Review Checklist**
```typescript
interface CodeReviewChecklist {
  safety: {
    crisisDetection: "All user inputs go through crisis detection";
    errorHandling: "Graceful fallbacks for all failure scenarios";
    confidenceValidation: "Low confidence responses flagged for human review";
    emergencyProtocols: "Crisis escalation paths tested and verified";
  };
  
  privacy: {
    dataMinimization: "Only necessary data collected and processed";
    encryption: "All sensitive data encrypted before storage/transmission";
    anonymization: "Personal identifiers removed from analytics";
    deletion: "User data deletion procedures implemented";
  };
  
  performance: {
    responseTime: "All operations meet performance targets";
    caching: "Appropriate caching strategies implemented";
    fallbacks: "Fast fallback responses for service failures";
    monitoring: "Performance metrics tracked and alerting configured";
  };
  
  quality: {
    typeScript: "Strict TypeScript with no any types";
    testing: "95%+ test coverage for critical paths";
    accessibility: "WCAG AA compliance verified";
    documentation: "Public APIs documented with examples";
  };
}
```

### **Deployment Requirements**
```typescript
// Pre-Deployment Validation
interface DeploymentGates {
  security: {
    vulnScan: "No high or critical vulnerabilities";
    secrets: "No hardcoded secrets or keys";
    dependencies: "All dependencies security-scanned";
    access: "Proper access controls configured";
  };
  
  functionality: {
    crisisDetection: "Crisis detection accuracy >95%";
    voiceProcessing: "Voice pipeline end-to-end tested";
    fallbacks: "All fallback systems operational";
    monitoring: "Health checks and alerting active";
  };
  
  compliance: {
    privacy: "Privacy policy compliance verified";
    safety: "Professional oversight protocols active";
    legal: "Terms of service and liability coverage confirmed";
    ethics: "Ethics board approval for significant changes";
  };
}

// Deployment Script
async function deployToProduction(): Promise<void> {
  await validateDeploymentGates();
  await runSecurityScan();
  await runPerformanceTests();
  await validateCrisisDetection();
  await deploy();
  await validatePostDeployment();
  await notifyStakeholders();
}
```

---

## 🔧 **Development Workflow**

### **Branch Strategy**
```bash
# Git Flow for Safety-Critical Development
main            # Production-ready code only
├── develop     # Integration branch for features
├── feature/*   # Individual feature development
├── hotfix/*    # Critical production fixes
└── safety/*    # Safety-critical updates (fast-track review)

# Required Checks Before Merge
- Crisis detection tests pass (100%)
- Privacy protection tests pass (100%)  
- Performance benchmarks met
- Security scan clean
- Code review approved by 2+ developers
- Clinical advisor approval (for coaching logic changes)
```

### **Environment Configuration**
```typescript
// Environment-Specific Settings
interface EnvironmentConfig {
  development: {
    aiProvider: "OpenAI GPT-4 (development key)";
    voiceProvider: "ElevenLabs (sandbox)";
    database: "Local Supabase instance";
    encryption: "Reduced key size for faster testing";
    crisisDetection: "Test mode with mock escalation";
  };
  
  staging: {
    aiProvider: "OpenAI GPT-4 (staging key)";
    voiceProvider: "ElevenLabs (production endpoint, test voice)";
    database: "Staging Supabase with anonymized data";
    encryption: "Production-grade encryption";
    crisisDetection: "Full detection with test counselor endpoints";
  };
  
  production: {
    aiProvider: "OpenAI GPT-4 (production key with rate limits)";
    voiceProvider: "ElevenLabs (production with premium voice)";
    database: "Production Supabase with full backups";
    encryption: "Maximum security encryption";
    crisisDetection: "Live crisis detection with 24/7 human support";
  };
}
```

---

*Building Emma AI with safety, privacy, and excellence at every line of code* 🛡️💻