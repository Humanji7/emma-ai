# **Couple Session Mode Implementation Guide**

## **Overview**

Emma AI is expanding to support **couple coaching sessions** where partners share a single device for real-time conflict resolution coaching. This is a key differentiator for the hackathon demo.

### **Current State**

* ✅ Single-user voice recording via Web Audio API  
* ✅ Transcription via OpenAI Whisper  
* ✅ Emma AI coaching for individual users  
* ❌ NO multi-speaker support  
* ❌ NO speaker diarization  
* ❌ NO WebSocket/WebRTC infrastructure

### **Target State (Hackathon MVP)**

* Shared device mode (one phone between partners)  
* Simple speaker diarization via VAD \+ pause detection  
* Visual speaker differentiation (colors, positions)  
* Real-time conflict detection and interventions  
* Demo mode with pre-scripted scenarios

## **Technical Approach**

### **Voice Activity Detection (VAD)**

// Use webrtcvad for pause-based speaker switching  
// Logic: pause \>400ms \= speaker change  
// Fallback: manual tap-to-switch buttons

### **Speaker Differentiation Strategy**

// Priority order (simple to complex):  
// 1\. Turn-taking via pause detection (VAD)  
// 2\. Pitch detection (optional enhancement)  
// 3\. Manual tap for speaker switching  
// 4\. Voice calibration at session start

### **UI/UX Patterns**

// Horizontal phone orientation  
// Left side \= Partner A (blue \#0066FF)  
// Right side \= Partner B (coral \#FF6A3D)  
// Center \= Emma interventions (green \#22C55E)  
// Audio level visualization for each speaker

### **Conflict Detection Rules**

// Emotional escalation indicators:  
// \- Volume increase (\>10dB spike)  
// \- Blame patterns ("you always", "you never")  
// \- Interruptions (overlap \>60%)  
// \- Crisis keywords detection

// Intervention timing:  
// \- After pause \>450ms  
// \- On shout detection (\>95dB)  
// \- On overlap \>30% for 5 seconds  
// \- Code word: "red pineapple"

## **Key Components**

### **CoupleVoiceRecorder**

Extends existing VoiceRecorder with:

* Speaker state management  
* VAD integration for turn detection  
* Pitch-based speaker verification  
* Manual switching fallback UI

### **CoupleConversationInterface**

Modifies existing conversation UI with:

* Color-coded messages by speaker  
* Conflict level indicator (0-10 scale)  
* Active speaker visualization  
* Turn-taking visual cues

### **ConflictInterventionService**

New service for:

* Conflict pattern analysis  
* Emma intervention timing  
* Gottman Method phrase library  
* De-escalation strategies

### **CoupleCrisisDetection**

Extends CrisisDetectionService with:

* Couple-specific violence indicators  
* Code word processing  
* Silent escalation mode  
* Partner safety protocols

## **Emma Prompting for Couple Mode**

const coupleSystemPrompt \= \`  
You are Emma, a real-time relationship coach facilitating a couple's conversation.

Current state:  
\- Partner A (last 3 messages): ${partnerAMessages}  
\- Partner B (last 3 messages): ${partnerBMessages}  
\- Conflict level: ${conflictLevel}/10  
\- Last speaker: Partner ${currentSpeaker}

Provide a brief intervention (max 60 chars) that:  
1\. Acknowledges both perspectives  
2\. Teaches ONE specific skill  
3\. De-escalates tension  
4\. Uses Gottman Method principles

Be warm but direct. Focus on immediate actionable guidance.  
\`;

## **Demo Scenarios**

### **"Household Chores" Conflict (3 minutes)**

00:00-00:30 \- Conflict escalation without Emma  
00:30-02:00 \- Emma activation and de-escalation  
02:00-02:30 \- Crisis detection demonstration  
02:30-03:00 \- Successful resolution

Key moments:  
\- Transition from blame to "I feel" statements  
\- Visual emotion level reduction  
\- Speaker color changes on turn-taking  
\- Timely Emma interventions

## **Fallback Strategies**

### **Priority Order**

1. **Manual tap mode** \- Partners indicate who's speaking  
2. **Text-only mode** \- If audio capture fails  
3. **Turn-based single voice** \- Strict alternation  
4. **Pre-recorded demo** \- Last resort

### **Technical Fallbacks**

// VAD failure → Enable manual switching UI  
// Pitch detection failure → Ignore, use VAD only  
// Whisper timeout → Web Speech API  
// Complete failure → Demo mode activation

## **Implementation Priorities**

### **Days 1-2: Foundation**

□ Install webrtcvad, pitchy packages  
□ Create VoiceActivityDetectionService  
□ Add speaker state to VoiceRecorder  
□ Basic two-speaker UI layout

### **Days 3-4: Core Features**

□ CoupleVoiceRecorder component  
□ Speaker color coding system  
□ Conflict detection algorithms  
□ Emma intervention timing logic

### **Days 5-6: Integration**

□ Couple-specific Emma prompts  
□ Crisis detection enhancements  
□ Demo mode implementation  
□ Performance optimization

### **Days 7-8: Polish & Testing**

□ All fallback strategies ready  
□ Demo scenarios perfected  
□ Latency optimization (\<2s)  
□ Edge case handling

## **Critical Success Metrics**

* **Response latency**: \<2 seconds speech-to-intervention  
* **Speaker accuracy**: \>80% correct attribution (or clear manual mode)  
* **UI smoothness**: Seamless speaker transitions  
* **Crisis detection**: 100% accuracy for keywords  
* **Demo reliability**: Zero failures during presentation

## **Testing Scenarios**

// 1\. Happy path: Clear pauses, distinct voices  
// 2\. Overlapping speech: Both talking simultaneously  
// 3\. Similar voices: Similar pitch characteristics  
// 4\. Crisis trigger: "red pineapple" detection  
// 5\. Network issues: Whisper API timeout handling  
// 6\. Audio failure: Graceful text mode transition

## **Important Notes**

1. **Don't over-engineer speaker diarization** \- Simple is better for demo  
2. **Visual clarity \> technical accuracy** \- Users must understand who's speaking  
3. **Demo mode must be flawless** \- This is the ultimate fallback  
4. **Safety first** \- Crisis detection cannot have false negatives  
5. **Optimize for shared device UX** \- Design for phone between two people

## **Code Integration Points**

// 1\. Extend existing VoiceRecorder  
class CoupleVoiceRecorder extends VoiceRecorder {  
  // Add VAD, speaker state, manual switching  
}

// 2\. Modify conversation store  
interface CoupleConversationState {  
  messages: CoupleMessage\[\]  
  currentSpeaker: 'A' | 'B'  
  conflictLevel: number  
  sessionMode: 'single' | 'couple'  
}

// 3\. Update API endpoints  
POST /api/couple-coaching  
POST /api/transcribe (add speaker parameter)

// 4\. Enhance crisis detection  
class CoupleCrisisDetection extends CrisisDetectionService {  
  // Add couple-specific patterns  
}

## **Demo Day Checklist**

□ Primary demo path tested 10+ times  
□ All fallbacks accessible within 2 taps  
□ Crisis detection shows immediate response  
□ Speaker switching visually clear  
□ Conflict de-escalation visible in UI  
□ Backup video ready on separate device  
□ Team roles defined for demo  
□ 3-minute script memorized

---

**Remember**: This feature showcases Emma AI's unique real-time intervention capability. Focus on creating a compelling visual demonstration that proves we can help couples resolve conflicts as they happen, not after the damage is done.

