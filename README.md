# 🤖 Emma AI - Real-time Relationship Coaching

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)

**Emma AI** is an advanced AI-powered relationship coach that provides real-time support with crisis detection and voice-first interaction.

## ✨ Features

- 🎤 **Voice-First Interface** - Natural conversation through speech
- 🧠 **GPT-4 Powered** - Intelligent relationship coaching
- 🚨 **Crisis Detection** - Automatic identification and escalation of crisis situations
- 📊 **Quality Monitoring** - Comprehensive quality gates and safety validation
- 🔒 **Privacy-First** - Zero-knowledge architecture with end-to-end security
- 💾 **Persistent Memory** - Long-term context and relationship tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- OpenAI API key
- Supabase account
- ElevenLabs API key (optional, for voice synthesis)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/emma-ai.git
cd emma-ai

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### API Keys Required

1. **OpenAI API** - For GPT-4 conversation and Whisper transcription
2. **Supabase** - For database and user management
3. **ElevenLabs** - For voice synthesis (optional)

## 🎯 Usage

1. **Emma AI Demo**: http://localhost:3000/demo
2. **Monitoring Dashboard**: http://localhost:3000/monitoring

### Example Conversations

**Relationship Support:**
> "I'm having trouble communicating with my partner about our future"

**Crisis Detection:**
> Emma automatically detects crisis language and provides appropriate resources

## 🏗️ Architecture

```
Emma AI/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API endpoints
│   │   ├── chat/         # Emma AI conversation
│   │   ├── transcribe/   # Voice transcription  
│   │   └── monitoring/   # Quality gates monitoring
│   ├── demo/             # Voice demo interface
│   └── monitoring/       # Real-time dashboard
├── components/           # React components
│   ├── voice/           # Voice UI components
│   └── ui/              # Base UI components  
├── lib/                 # Core logic
│   ├── ai/              # Emma AI core
│   └── monitoring/      # Quality gates system
└── types/              # TypeScript definitions
```

## 🛡️ Safety & Ethics

Emma AI implements multiple layers of safety:

1. **Crisis Detection** - Real-time identification of crisis situations
2. **Quality Gates** - 4-stage validation of every AI response
3. **Human Escalation** - Automatic handoff for critical situations
4. **Privacy Protection** - Zero-knowledge architecture

## 🧪 Testing

```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Lint code
npm run lint

# Check environment setup
npm run setup
```

## 📊 Monitoring

Emma AI includes comprehensive monitoring:

- **Quality Gates** - Real-time validation of AI responses
- **Crisis Detection** - Monitoring and alerting for crisis situations  
- **Performance Metrics** - Response times, confidence scores
- **Health Dashboard** - System status and recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

Emma AI is designed to provide supportive conversations and crisis detection, but is not a replacement for professional mental health services. In crisis situations, please contact appropriate emergency services or mental health professionals.

## 📞 Crisis Resources

- **988 Suicide & Crisis Lifeline**: 988
- **Crisis Text Line**: Text HOME to 741741
- **National Domestic Violence Hotline**: 1-800-799-7233

---

**Built with ❤️ for safer, more supportive relationships**
