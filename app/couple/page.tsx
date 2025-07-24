'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import svgPaths from '../../Emma Relationship Coach Chat Application/imports/svg-8onr0iri97'
import { VoiceRecorder } from '@/components/voice'
import { ConflictInterventionService } from '@/services/ConflictInterventionService'
import type { VoiceRecorderState, CoupleVoiceMessage, ConflictMetrics } from '@/types'

// Icon Components (adapted from Figma)
function Chat() {
  return (
    <div className="absolute inset-[8.333%]" data-name="Chat">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 20 20"
      >
        <g id="Chat">
          <path
            clipRule="evenodd"
            d={svgPaths.p37dff000}
            fill="var(--fill-0, #8E8E93)"
            fillRule="evenodd"
            id="Chat_2"
          />
        </g>
      </svg>
    </div>
  );
}

function Category() {
  return (
    <div
      className="absolute bottom-[8.333%] left-[8.333%] right-[8.334%] top-[8.333%]"
      data-name="Category"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 20 20"
      >
        <g id="Category">
          <path
            d={svgPaths.pf715240}
            fill="var(--fill-0, #8E8E93)"
            id="Category_2"
          />
        </g>
      </svg>
    </div>
  );
}

function Setting() {
  return (
    <div
      className="absolute bottom-[8.333%] left-[10.416%] right-[10.417%] top-[8.334%]"
      data-name="Setting"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 19 20"
      >
        <g id="Setting">
          <path
            d={svgPaths.p20be4e40}
            fill="var(--fill-0, #8E8E93)"
            id="Setting_2"
          />
        </g>
      </svg>
    </div>
  );
}

function Profile() {
  return (
    <div
      className="absolute bottom-[8.333%] left-[16.667%] right-[16.667%] top-[8.333%]"
      data-name="Profile"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 16 20"
      >
        <g id="Profile">
          <path
            d={svgPaths.p1d15d880}
            fill="var(--fill-0, #8E8E93)"
            id="Profile_2"
          />
        </g>
      </svg>
    </div>
  );
}

function Logout() {
  return (
    <div
      className="absolute bottom-[8.333%] left-[8.333%] right-[5.082%] top-[8.333%]"
      data-name="Logout"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 21 20"
      >
        <g id="Logout">
          <path
            d={svgPaths.p4de8f00}
            fill="var(--fill-0, #8E8E93)"
            id="Logout_2"
          />
        </g>
      </svg>
    </div>
  );
}

function Send() {
  return (
    <div className="absolute inset-[8.333%]" data-name="Send">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 20 20"
      >
        <g id="Send">
          <path
            d={svgPaths.pb1b6b10}
            fill="var(--fill-0, #8E8E93)"
            id="Send_2"
          />
        </g>
      </svg>
    </div>
  );
}

function Filter() {
  return (
    <div
      className="absolute bottom-[13.428%] left-[8.333%] right-[8.333%] top-[12.5%]"
      data-name="Filter"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 20 18"
      >
        <g id="Filter">
          <path
            d={svgPaths.p19b83f00}
            fill="var(--fill-0, #8E8E93)"
            id="Filter_2"
          />
        </g>
      </svg>
    </div>
  );
}

function Voice() {
  return (
    <div
      className="absolute bottom-[8.332%] left-[14.583%] right-[14.582%] top-[8.333%]"
      data-name="Voice"
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 25 30"
      >
        <g id="Voice">
          <path
            d={svgPaths.p20a41e80}
            fill="var(--fill-0, white)"
            id="Voice_2"
          />
        </g>
      </svg>
    </div>
  );
}

interface SidebarProps {
  onNavigate: (section: string) => void;
  activeSection: string;
}

function Sidebar({ onNavigate, activeSection }: SidebarProps) {
  const router = useRouter()
  
  return (
    <div
      className="absolute box-border content-stretch flex flex-col gap-[42px] h-[934px] items-center justify-start left-4 p-0 translate-y-[-50%] w-40"
      style={{ top: "calc(50% + 7px)" }}
    >
      <div className="relative shrink-0 size-12">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 48 48"
        >
          <circle
            cx="24"
            cy="24"
            fill="url(#paint0_linear_1_144)"
            id="Ellipse 1"
            r="24"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_1_144"
              x1="0"
              x2="48"
              y1="24.4898"
              y2="24.4898"
            >
              <stop stopColor="#3A3838" />
              <stop offset="1" stopColor="white" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="box-border content-stretch flex flex-col h-[850px] items-start justify-between p-0 relative shrink-0 w-full">
        <div className="box-border content-stretch flex flex-col gap-4 items-start justify-start p-0 relative shrink-0 w-full">
          <button
            onClick={() => onNavigate("session")}
            className={`bg-[#f2f2f7] relative rounded-lg shrink-0 w-full hover:bg-[#e8e8ed] transition-colors ${
              activeSection === "session"
                ? "opacity-100"
                : "opacity-80"
            }`}
          >
            <div className="flex flex-row items-center relative size-full">
              <div className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-[4px] relative w-full">
                <div className="relative shrink-0 size-6">
                  <Chat />
                </div>
                <div className="font-['Poppins:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#131313] text-[18px] text-center text-nowrap">
                  <p className="block leading-[normal] whitespace-pre">
                    Session
                  </p>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate("menu")}
            className={`box-border content-stretch flex flex-row gap-2 items-center justify-start p-[4px] relative rounded-lg shrink-0 w-40 hover:bg-[#f2f2f7] transition-colors ${
              activeSection === "menu"
                ? "opacity-100"
                : "opacity-80"
            }`}
          >
            <div className="relative shrink-0 size-6">
              <Category />
            </div>
            <div className="font-['Poppins:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#131313] text-[18px] text-center text-nowrap">
              <p className="block leading-[normal] whitespace-pre">
                Menu
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className={`box-border content-stretch flex flex-row gap-2 items-center justify-start p-[4px] relative rounded-lg shrink-0 w-40 hover:bg-[#f2f2f7] transition-colors ${
              activeSection === "settings"
                ? "opacity-100"
                : "opacity-80"
            }`}
          >
            <div className="relative shrink-0 size-6">
              <Setting />
            </div>
            <div className="font-['Poppins:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#131313] text-[18px] text-center text-nowrap">
              <p className="block leading-[normal] whitespace-pre">
                Settings
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate("account")}
            className={`box-border content-stretch flex flex-row gap-2 items-center justify-start p-[4px] relative rounded-lg shrink-0 w-40 hover:bg-[#f2f2f7] transition-colors ${
              activeSection === "account"
                ? "opacity-100"
                : "opacity-80"
            }`}
          >
            <div className="relative shrink-0 size-6">
              <Profile />
            </div>
            <div className="font-['Poppins:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#131313] text-[18px] text-center text-nowrap">
              <p className="block leading-[normal] whitespace-pre">
                Account
              </p>
            </div>
          </button>
        </div>

        <button
          onClick={() => router.push('/couple/first-step')}
          className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-[4px] relative rounded-lg shrink-0 w-40 hover:bg-[#f2f2f7] transition-colors"
        >
          <div className="relative shrink-0 size-6">
            <Setting />
          </div>
          <div className="font-['Poppins:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#131313] text-[18px] text-center text-nowrap">
            <p className="block leading-[normal] whitespace-pre">
              Setup
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

interface ChatMessage {
  id: string;
  sender: "user" | "emma" | "A" | "B";
  message: string;
  timestamp: Date;
  conflictLevel?: number;
  emotionalTone?: string;
}

export default function CouplePage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("session");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceRecorderState>('idle')
  
  // Conflict intervention service
  const conflictServiceRef = useRef<ConflictInterventionService | null>(null)
  const [conflictMetrics, setConflictMetrics] = useState<ConflictMetrics>({
    currentLevel: 0,
    escalationTrend: 'stable',
    blamePatternCount: 0,
    interruptionCount: 0,
    lastInterventionTime: 0,
    sessionStartTime: Date.now()
  })

  useEffect(() => {
    if (!conflictServiceRef.current) {
      conflictServiceRef.current = new ConflictInterventionService()
      console.log('🧘‍♀️ Emma conflict intervention service initialized')
    }
    
    return () => {
      conflictServiceRef.current?.resetSession()
    }
  }, [])

  // Load calibration settings
  useEffect(() => {
    const savedCalibration = localStorage.getItem('emmaVoiceCalibration')
    if (!savedCalibration) {
      // Redirect to first-step if no calibration found
      router.push('/couple/first-step')
    }
  }, [router])

  const topics = [
    "Household issues",
    "Jealousy", 
    "Planning family",
  ];

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "emma",
      message: `Great choice! Let's work through your ${topic.toLowerCase()} situation together. Can you tell me more about what's been happening?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    setProgress(10);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      message: chatInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");

    try {
      // Send to real Emma AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatInput,
          coupleMode: true,
          speaker: 'A', // Default to A for manual input
          conversationHistory: messages.slice(-5).map(msg => ({
            id: msg.id,
            text: msg.message,
            speaker: msg.sender === 'emma' ? 'emma' : msg.sender === 'user' ? 'A' : msg.sender,
            timestamp: msg.timestamp.toISOString()
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        const emmaResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "emma",
          message: data.response,
          timestamp: new Date(),
          conflictLevel: data.metadata?.coupleMode ? data.metadata.conflictAnalysis?.conflictLevel : undefined
        };

        setMessages((prev) => [...prev, emmaResponse]);
        setProgress((prev) => Math.min(prev + 15, 90));

        // Update conflict metrics if available
        if (data.metadata?.coupleMode && data.metadata.conflictAnalysis) {
          setConflictMetrics(prev => ({
            ...prev,
            currentLevel: data.metadata.conflictAnalysis.conflictLevel || 0
          }))
        }
      } else {
        throw new Error('Failed to get Emma response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Fallback to simulated response
      setTimeout(() => {
        const responses = [
          "I understand how challenging that must feel. Let's break this down step by step.",
          "That's a common situation many couples face. What do you think might be the underlying cause?",
          "Thank you for sharing that with me. How did that make you feel?",
          "Let's explore some strategies that might help. Have you tried discussing this openly with your partner?",
          "Communication is key in relationships. How do you usually approach difficult conversations?",
          "I hear you. It sounds like you're both trying your best. What outcome would you ideally want to see?",
        ];

        const emmaResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: "emma",
          message: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, emmaResponse]);
        setProgress((prev) => Math.min(prev + 15, 90));
      }, 1000);
    }
  };

  const handleVoiceTranscription = (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      message: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Handle as regular message
    setChatInput(text);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setChatInput(
          "I've been having trouble with communication lately...",
        );
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  if (activeSection !== "session") {
    return (
      <div
        className="bg-[#f3f3f3] relative size-full min-h-screen"
        data-name="Chat Emma"
      >
        <div className="absolute bg-gradient-to-b from-[#fbcbc933] h-[1024px] left-0 to-[#f0dbfa] top-0 via-[#f6d9de80] via-[51.442%] w-[1440px]" />
        <Sidebar
          onNavigate={setActiveSection}
          activeSection={activeSection}
        />
        <div className="absolute bg-[#f3f4f7] h-[1008px] left-48 rounded-3xl top-2 w-[1240px]">
          <div className="h-[1008px] overflow-clip relative w-[1240px] flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-[32px] font-['Poppins:Medium',_sans-serif] text-[#000000] mb-4 capitalize">
                {activeSection}
              </h2>
              <p className="text-[18px] font-['Poppins:Regular',_sans-serif] text-[#424242] mb-8">
                {activeSection === "menu" &&
                  "Navigate through different sections of the app."}
                {activeSection === "settings" &&
                  "Customize your Emma experience and preferences."}
                {activeSection === "account" &&
                  "Manage your profile and account settings."}
              </p>
              <button
                onClick={() => setActiveSection("session")}
                className="bg-[#5856d6] hover:bg-[#4845c7] text-white px-6 py-2 rounded-lg"
              >
                Back to Session
              </button>
            </div>
          </div>
          <div className="absolute border border-[#f2f2f7] border-solid inset-0 pointer-events-none rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-[#f3f3f3] relative size-full min-h-screen"
      data-name="Chat Emma"
    >
      <div className="absolute bg-gradient-to-b from-[#fbcbc933] h-[1024px] left-0 to-[#f0dbfa] top-0 via-[#f6d9de80] via-[51.442%] w-[1440px]" />
      <Sidebar
        onNavigate={setActiveSection}
        activeSection={activeSection}
      />

      <div className="absolute bg-[#f3f4f7] h-[1008px] left-48 rounded-3xl top-2 w-[1240px]">
        <div className="h-[1008px] overflow-clip relative w-[1240px]">
          {/* Chat Messages Area */}
          {messages.length > 0 && (
            <div className="absolute left-[140px] top-[50px] w-[960px] max-h-[300px] overflow-y-auto">
              <div className="space-y-4 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user" || message.sender === "A" || message.sender === "B" 
                        ? "justify-end" 
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                        message.sender === "user" || message.sender === "A" || message.sender === "B"
                          ? "bg-[#5856d6] text-white"
                          : "bg-white text-[#000000] border border-[#e5e5ea] shadow-sm"
                      }`}
                    >
                      <p className="font-['Poppins:Regular',_sans-serif] text-[16px] leading-[1.4]">
                        {message.message}
                      </p>
                      {message.conflictLevel !== undefined && message.conflictLevel > 0 && (
                        <div className="mt-2 text-xs">
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                            Conflict Level: {message.conflictLevel}/10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Welcome Section */}
          <div className="absolute box-border content-stretch flex flex-col gap-[260px] items-center justify-start left-[140px] p-0 top-[278px] w-[960px]">
            <div className="box-border content-stretch flex flex-col gap-6 items-center justify-start p-0 relative shrink-0 w-full">
              <div className="box-border content-stretch flex flex-col gap-4 items-center justify-start p-0 relative shrink-0 w-full">
                <div className="relative shrink-0 size-[100px]">
                  <div className="w-[100px] h-[100px] bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🧘‍♀️</span>
                  </div>
                </div>
                <div
                  className="font-['Poppins:Regular',_sans-serif] leading-[0] min-w-full not-italic relative shrink-0 text-[#424242] text-[16px] text-center"
                  style={{ width: "min-content" }}
                >
                  <p className="block leading-[normal]">
                    Welcome to your couple session!
                  </p>
                </div>
              </div>

              <div className="box-border content-stretch flex flex-col gap-1 items-start justify-start leading-[0] not-italic p-0 relative shrink-0 text-center w-[954px]">
                <div className="font-['Poppins:Medium',_sans-serif] relative shrink-0 text-[42px] text-neutral-900 w-full">
                  <p className="block leading-[60px]">{`I'm Emma—your relationship coach! `}</p>
                </div>
                <div className="font-['Poppins:Regular',_sans-serif] relative shrink-0 text-[#424242] text-[24px] w-full">
                  <p className="block leading-[normal]">
                    Let's work through the conflict you're
                    facing right now, one clear step at a time.
                  </p>
                </div>
              </div>
            </div>

            {/* Topic Selection and Chat Input */}
            <div className="box-border content-stretch flex flex-col gap-6 items-center justify-start p-0 relative shrink-0 w-full">
              <div className="box-border content-stretch flex flex-col gap-4 items-center justify-start p-0 relative shrink-0">
                {!selectedTopic && (
                  <div className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-0 relative shrink-0">
                    <div className="bg-[rgba(88,86,214,0.1)] box-border content-stretch flex flex-row gap-2.5 items-center justify-center px-4 py-2 relative rounded-2xl shrink-0">
                      <div className="absolute border border-[#5856d6] border-solid inset-0 pointer-events-none rounded-2xl" />
                      <button
                        onClick={() =>
                          handleTopicSelect("Household issues")
                        }
                        className="font-['Poppins:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#131313] text-[18px] text-center text-nowrap hover:text-[#5856d6] transition-colors"
                      >
                        <p className="block leading-[normal] whitespace-pre">{`Household issues `}</p>
                      </button>
                    </div>

                    <div className="bg-[rgba(88,86,214,0.1)] box-border content-stretch flex flex-row gap-2.5 items-center justify-center px-4 py-2 relative rounded-2xl shrink-0">
                      <div className="absolute border border-[#5856d6] border-solid inset-0 pointer-events-none rounded-2xl" />
                      <button
                        onClick={() =>
                          handleTopicSelect("Jealousy")
                        }
                        className="font-['Poppins:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#131313] text-[18px] text-center text-nowrap hover:text-[#5856d6] transition-colors"
                      >
                        <p className="block leading-[normal] whitespace-pre">
                          Jealousy
                        </p>
                      </button>
                    </div>

                    <div className="bg-[rgba(88,86,214,0.1)] box-border content-stretch flex flex-row gap-2.5 items-center justify-center px-4 py-2 relative rounded-2xl shrink-0">
                      <div className="absolute border border-[#5856d6] border-solid inset-0 pointer-events-none rounded-2xl" />
                      <button
                        onClick={() =>
                          handleTopicSelect("Planning family")
                        }
                        className="font-['Poppins:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#131313] text-[18px] text-center text-nowrap hover:text-[#5856d6] transition-colors"
                      >
                        <p className="block leading-[normal] whitespace-pre">
                          Planning family
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                <div className="box-border content-stretch flex flex-row gap-2 items-start justify-start p-0 relative shrink-0 w-[960px]">
                  <div className="basis-0 bg-[#e5e5ea] grow min-h-px min-w-px relative rounded-3xl shrink-0">
                    <div className="relative size-full">
                      <div className="box-border content-stretch flex flex-col gap-2 items-start justify-start px-6 py-4 relative w-full">
                        <div className="box-border content-stretch flex flex-row items-center justify-between p-0 relative shrink-0 w-full">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) =>
                              setChatInput(e.target.value)
                            }
                            onKeyPress={handleKeyPress}
                            placeholder="Write your thoughts here..."
                            className="bg-transparent border-none outline-none font-['Poppins:Regular',_sans-serif] text-[#000000] text-[18px] flex-1 placeholder:text-[#8E8E93]"
                          />
                          <div className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-0 relative shrink-0">
                            <button
                              onClick={handleSendMessage}
                              className="relative shrink-0 size-6 hover:bg-[#f2f2f7] rounded transition-colors"
                            >
                              <Send />
                            </button>
                            <div className="relative shrink-0 size-6">
                              <Filter />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Integrated Voice Recorder */}
                  <div className="relative">
                    <VoiceRecorder
                      state={voiceState}
                      onStateChange={setVoiceState}
                      onTranscription={handleVoiceTranscription}
                      onError={(error) => console.error('Voice error:', error)}
                      className="hidden" // Hide the default UI
                    />
                    <button
                      onClick={() => {
                        if (voiceState === 'idle') {
                          setVoiceState('listening')
                          setIsRecording(true)
                        } else {
                          setVoiceState('idle')
                          setIsRecording(false)
                        }
                      }}
                      className={`bg-[#5856d6] box-border content-stretch flex flex-row gap-2.5 items-center justify-start p-[12px] relative rounded-[29.5px] shrink-0 size-[59px] hover:scale-105 transition-transform ${
                        isRecording || voiceState === 'listening'
                          ? "animate-pulse bg-[#ff4444]"
                          : ""
                      }`}
                    >
                      <div className="relative shrink-0 size-[35px]">
                        <Voice />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="box-border content-stretch flex flex-col gap-1 items-center justify-start p-0 relative shrink-0 w-80">
                <div className="bg-[#d9d9d9] h-3 rounded-3xl shrink-0 w-full relative overflow-hidden">
                  <div
                    className="bg-[#5856d6] h-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="font-['Poppins:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[16px] text-center tracking-[0.32px] w-full">
                  <p className="block leading-[normal]">{`Conflict resolution progress `}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conflict Status Indicator (subtle) */}
          {messages.length > 0 && conflictMetrics.currentLevel > 0 && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  conflictMetrics.currentLevel >= 7 ? 'bg-red-500' :
                  conflictMetrics.currentLevel >= 4 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}></div>
                <span className="text-xs text-gray-600">
                  Conflict: {conflictMetrics.currentLevel.toFixed(1)}/10
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="absolute border border-[#f2f2f7] border-solid inset-0 pointer-events-none rounded-3xl" />
      </div>
    </div>
  );
}