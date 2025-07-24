# Unified Couple Voice Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CoupleVoiceManager                       │
│  Single entry point for all voice operations               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────────┐
│              Core Components                                │
├─────────────────────┼───────────────────────────────────────┤
│ VoiceCalibration    │ SpeakerDetection │ VoiceProfileStorage │
│ - Quick (30s each)  │ - 70% accuracy   │ - Persistent saves  │
│ - Advanced (2-3min) │ - Real-time      │ - Couple profiles   │
└─────────────────────┼───────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────────┐
│              Integration Layer                              │
├─────────────────────┼───────────────────────────────────────┤
│ Emma TTS Integration│ API Layer        │ UI Components       │
│ - Eleven Labs       │ - /api/chat      │ - Desktop/Mobile    │
│ - Voice responses   │ - Couple mode    │ - Unified interface │
└─────────────────────┴───────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Core Manager (Days 1-3)
- [ ] Create `CoupleVoiceManager` class
- [ ] Consolidate existing detection services
- [ ] Implement profile storage system

### Phase 2: Calibration System (Days 4-6)
- [ ] Quick calibration (30s workflow)
- [ ] Advanced calibration (2-3min workflow)
- [ ] Profile persistence and loading

### Phase 3: UI Unification (Days 7-8)
- [ ] Single voice interface component
- [ ] Responsive design (desktop/mobile)
- [ ] Calibration workflow UI

### Phase 4: TTS Integration (Days 9-10)
- [ ] Eleven Labs integration
- [ ] Emma voice responses
- [ ] Audio playback system

## Technical Specifications

### Accuracy Targets
- **Quick Calibration**: 70% accuracy minimum
- **Advanced Calibration**: 85%+ accuracy target
- **Fallback**: Manual speaker selection if <60%

### Performance Requirements
- **Latency**: 2-3s acceptable for quality
- **Calibration Time**: 
  - Quick: 30s per person (60s total)
  - Advanced: 2-3min per person (4-6min total)
- **Storage**: Local storage + optional cloud sync

### Platform Support
- **Desktop**: Primary target, full features
- **Mobile**: Responsive design, touch-optimized
- **Browsers**: Chrome, Safari, Firefox, Edge

## API Integration Points

### Current Endpoints
- `/api/chat` - Enhanced for couple mode
- `/api/transcribe` - Voice-to-text processing

### New Endpoints Needed
- `/api/voice/calibrate` - Calibration data processing
- `/api/voice/profiles` - Profile CRUD operations
- `/api/voice/tts` - Eleven Labs TTS integration

## Data Flow

```
User Speech → Audio Capture → Speaker Detection → Transcription → 
Emma Processing → TTS Generation → Audio Playback
     ↓              ↓              ↓           ↓
Profile Storage ← Calibration ← API Layer ← Response
```

## Migration Strategy

### Current State Consolidation
1. **Keep**: VoiceCalibrationWizard (enhance)
2. **Consolidate**: 4 speaker detection services → 1 unified
3. **Simplify**: Remove multiple voice recorder variants
4. **Enhance**: Single couple interface with all features

### Backward Compatibility
- Existing calibration data migration
- Graceful fallback for uncalibrated users
- Progressive enhancement approach