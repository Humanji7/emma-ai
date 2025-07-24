# Eleven Labs Integration Plan

## Overview
Integration of Eleven Labs TTS API for Emma's voice responses in couple conversations.

## Implementation Status

### ✅ Completed
1. **ElevenLabsTTSService** - Core TTS service with emotional context
2. **Voice Configuration** - Emotional voice settings for different contexts
3. **Audio Management** - Play/stop controls and resource cleanup
4. **Error Handling** - Graceful fallbacks and error recovery

### 🔄 In Progress
1. **API Key Management** - Environment variable setup
2. **Voice Selection** - Emma's optimal voice configuration
3. **Integration Testing** - End-to-end conversation flow

### 📋 TODO
1. **Environment Setup** - Add ELEVENLABS_API_KEY to .env.local
2. **Voice Optimization** - Fine-tune voice settings for Emma
3. **Performance Optimization** - Caching and latency reduction
4. **Mobile Support** - iOS/Android audio handling

## API Configuration

### Required Environment Variables
```bash
# Add to .env.local
ELEVENLABS_API_KEY=your_api_key_here
```

### Recommended Voice Settings
```typescript
// Emma's voice configuration
{
  voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm, empathetic
  model: 'eleven_turbo_v2',         // Fast response time
  stability: 0.6,                   // Balanced stability
  similarityBoost: 0.8,             // High similarity
  style: 0.2,                       // Slightly expressive
  useSpeakerBoost: true             // Enhanced clarity
}
```

## Emotional Context Mapping

| Conflict Level | Emotional Tone | Voice Settings |
|---------------|----------------|----------------|
| 0-3 (Low) | calm | stability: 0.6, style: 0.2 |
| 4-6 (Medium) | empathetic | stability: 0.7, style: 0.4 |
| 7-8 (High) | supportive | stability: 0.8, style: 0.1 |
| 9-10 (Crisis) | gentle | stability: 0.9, style: 0.05 |

## Integration Points

### 1. UnifiedCoupleVoice Component
- Initializes TTS service on component mount
- Calls `speakEmmaResponse()` for AI responses
- Manages audio playback state

### 2. CoupleVoiceManager
- Coordinates between voice detection and TTS
- Provides context for emotional voice adaptation
- Manages conversation flow timing

### 3. API Integration
- `/api/chat` endpoint integration for Emma responses
- Conflict analysis integration for voice context
- Real-time response generation and playback

## Performance Optimization

### Caching Strategy
- Cache common Emma phrases (greetings, interventions)
- Pre-generate frequent response patterns
- Implement audio blob caching for session reuse

### Latency Reduction
- Use `eleven_turbo_v2` model for speed
- Implement audio streaming for long responses
- Pre-load audio context for immediate playback

### Error Handling
- Fallback to browser speech synthesis if API fails
- Graceful degradation for network issues
- User-friendly error messages

## Testing Plan

### Unit Tests
- TTS service initialization
- Audio generation and playback
- Error handling scenarios
- Voice settings adaptation

### Integration Tests
- End-to-end conversation flow
- Emma response generation and speech
- Mobile device compatibility
- Network failure recovery

### User Testing
- Voice quality assessment
- Emotional appropriateness
- Response timing optimization
- Cross-platform consistency

## Mobile Considerations

### iOS Specific
- Web Audio API limitations
- Silent mode handling
- Background audio policies
- Headphone detection

### Android Specific
- Chrome audio context requirements
- Battery optimization impacts
- Audio routing preferences
- Notification interference

## Production Deployment

### Environment Setup
```bash
# Production environment variables
ELEVENLABS_API_KEY=sk-xxx...
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MODEL=eleven_turbo_v2
```

### Monitoring
- TTS API usage tracking
- Audio generation latency metrics
- Error rate monitoring
- User engagement analytics

### Cost Management
- Character count optimization
- Request caching strategies
- Usage-based scaling
- Budget alerts and limits

## Implementation Timeline

### Phase 1 (Days 1-2): Core Integration
- [x] ElevenLabsTTSService implementation
- [x] Basic audio generation and playback
- [ ] Environment configuration
- [ ] Initial voice testing

### Phase 2 (Days 3-4): Optimization
- [ ] Emotional context integration
- [ ] Performance optimization
- [ ] Error handling refinement
- [ ] Mobile compatibility testing

### Phase 3 (Days 5-6): Production Ready
- [ ] End-to-end testing
- [ ] Performance monitoring
- [ ] User acceptance testing
- [ ] Documentation completion

## Usage Examples

### Basic TTS Generation
```typescript
const ttsService = new ElevenLabsTTSService()
await ttsService.initialize()

const result = await ttsService.generateSpeech(
  "I understand you're feeling frustrated. Let's work through this together.",
  { emotionalContext: 'empathetic' }
)

if (result.success) {
  await ttsService.playAudio(result.audioUrl!)
}
```

### Contextual Emma Response
```typescript
await ttsService.speakEmmaResponse(
  "I notice the tension is rising. Would you like to take a moment to breathe?",
  {
    conflictLevel: 7,
    emotionalTone: 'frustrated',
    isIntervention: true
  }
)
```