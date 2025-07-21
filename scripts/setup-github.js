#!/usr/bin/env node

/**
 * GitHub Repository Setup for Emma AI
 * Создаёт публичный репозиторий и настраивает MCP GitHub интеграцию
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

console.log(`${colors.bold}${colors.magenta}`)
console.log(`╔══════════════════════════════════════╗`)
console.log(`║        Emma AI GitHub Setup          ║`)
console.log(`║    Repository & MCP Configuration    ║`)
console.log(`╚══════════════════════════════════════╝`)
console.log(colors.reset)

function checkGitInstallation() {
  try {
    execSync('git --version', { stdio: 'ignore' })
    console.log(`${colors.green}✅ Git is installed${colors.reset}`)
    return true
  } catch {
    console.log(`${colors.red}❌ Git is not installed${colors.reset}`)
    console.log(`${colors.yellow}Please install Git: https://git-scm.com/${colors.reset}`)
    return false
  }
}

function checkGHCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' })
    console.log(`${colors.green}✅ GitHub CLI is installed${colors.reset}`)
    return true
  } catch {
    console.log(`${colors.yellow}⚠️  GitHub CLI not found${colors.reset}`)
    console.log(`${colors.cyan}Install with: brew install gh${colors.reset}`)
    return false
  }
}

function initializeGitRepo() {
  console.log(`\n${colors.bold}🔧 Initializing Git Repository${colors.reset}`)
  
  try {
    // Check if already a git repo
    if (fs.existsSync('.git')) {
      console.log(`${colors.blue}ℹ️  Git repository already exists${colors.reset}`)
      return true
    }
    
    execSync('git init', { stdio: 'inherit' })
    console.log(`${colors.green}✅ Git repository initialized${colors.reset}`)
    return true
  } catch (error) {
    console.log(`${colors.red}❌ Failed to initialize git repo: ${error.message}${colors.reset}`)
    return false
  }
}

function createGitignore() {
  const gitignoreContent = `# Dependencies
node_modules/
.npm
.yarn
.pnpm-debug.log*

# Environment files
.env
.env.local
.env.production
.env.development

# Next.js
.next/
out/
build/
dist/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# MCP Server logs
mcp-*.log

# Emma AI specific
analytics/
monitoring-data/
user-sessions/
crisis-logs/

# Temporary files
tmp/
temp/
`

  fs.writeFileSync('.gitignore', gitignoreContent)
  console.log(`${colors.green}✅ .gitignore created${colors.reset}`)
}

function createREADME() {
  const readmeContent = `# 🤖 Emma AI - Real-time Relationship Coaching

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

\`\`\`bash
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
\`\`\`

### API Keys Required

1. **OpenAI API** - For GPT-4 conversation and Whisper transcription
2. **Supabase** - For database and user management
3. **ElevenLabs** - For voice synthesis (optional)

## 🎯 Usage

1. **Voice Demo**: http://localhost:3000/demo
2. **Monitoring Dashboard**: http://localhost:3000/monitoring
3. **Testing Interface**: http://localhost:3000/test

### Example Conversations

**Relationship Support:**
> "I'm having trouble communicating with my partner about our future"

**Crisis Detection:**
> Emma automatically detects crisis language and provides appropriate resources

## 🏗️ Architecture

\`\`\`
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
\`\`\`

## 🛡️ Safety & Ethics

Emma AI implements multiple layers of safety:

1. **Crisis Detection** - Real-time identification of crisis situations
2. **Quality Gates** - 4-stage validation of every AI response
3. **Human Escalation** - Automatic handoff for critical situations
4. **Privacy Protection** - Zero-knowledge architecture

## 🧪 Testing

\`\`\`bash
# Run tests
npm test

# Type checking
npm run typecheck

# Lint code
npm run lint

# Check environment setup
npm run setup
\`\`\`

## 📊 Monitoring

Emma AI includes comprehensive monitoring:

- **Quality Gates** - Real-time validation of AI responses
- **Crisis Detection** - Monitoring and alerting for crisis situations  
- **Performance Metrics** - Response times, confidence scores
- **Health Dashboard** - System status and recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit changes (\`git commit -m 'Add amazing feature'\`)
4. Push to branch (\`git push origin feature/amazing-feature\`)
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
`

  fs.writeFileSync('README.md', readmeContent)
  console.log(`${colors.green}✅ README.md created${colors.reset}`)
}

function createLicense() {
  const licenseContent = `MIT License

Copyright (c) 2025 Emma AI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

  fs.writeFileSync('LICENSE', licenseContent)
  console.log(`${colors.green}✅ LICENSE created${colors.reset}`)
}

function updateMCPConfig() {
  console.log(`\n${colors.bold}🔧 Updating MCP Configuration for GitHub${colors.reset}`)
  
  const configPath = path.join(process.cwd(), 'mcp-config.json')
  
  let config = { mcpServers: {} }
  
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  }
  
  // Add GitHub MCP server
  config.mcpServers['github'] = {
    "command": "npx",
    "args": ["@andrebuzeli/github-mcp-v2"],
    "description": "GitHub operations for Emma AI",
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": process.env.GITHUB_TOKEN || "your_github_token_here"
    }
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log(`${colors.green}✅ MCP config updated with GitHub server${colors.reset}`)
}

function showInstructions() {
  console.log(`\n${colors.bold}📋 Next Steps${colors.reset}`)
  console.log(`${colors.yellow}To create a public GitHub repository:${colors.reset}\n`)
  
  console.log(`${colors.bold}1. Get GitHub Personal Access Token:${colors.reset}`)
  console.log(`   • Go to: https://github.com/settings/tokens`)
  console.log(`   • Generate new token (classic)`)
  console.log(`   • Select scopes: repo, workflow, write:packages`)
  console.log(`   • Copy the token`)
  
  console.log(`\n${colors.bold}2. Set environment variable:${colors.reset}`)
  console.log(`   ${colors.cyan}export GITHUB_TOKEN="your_token_here"${colors.reset}`)
  
  console.log(`\n${colors.bold}3. Create repository with GitHub CLI:${colors.reset}`)
  console.log(`   ${colors.cyan}gh repo create emma-ai --public --source=. --description="Emma AI - Real-time Relationship Coaching"${colors.reset}`)
  
  console.log(`\n${colors.bold}4. Push initial commit:${colors.reset}`)
  console.log(`   ${colors.cyan}git add .${colors.reset}`)
  console.log(`   ${colors.cyan}git commit -m "🎉 Initial commit - Emma AI MVP"${colors.reset}`)
  console.log(`   ${colors.cyan}git push -u origin main${colors.reset}`)
  
  console.log(`\n${colors.bold}5. Update MCP with your token:${colors.reset}`)
  console.log(`   • Edit mcp-config.json`)
  console.log(`   • Replace "your_github_token_here" with actual token`)
  
  console.log(`\n${colors.green}🎯 Repository URL will be: https://github.com/YOUR_USERNAME/emma-ai${colors.reset}`)
}

function main() {
  try {
    console.log(`${colors.bold}Checking prerequisites...${colors.reset}\n`)
    
    const gitInstalled = checkGitInstallation()
    const ghInstalled = checkGHCLI()
    
    if (!gitInstalled) {
      process.exit(1)
    }
    
    initializeGitRepo()
    createGitignore()
    createREADME()
    createLicense()
    updateMCPConfig()
    
    console.log(`\n${colors.green}🎉 GitHub setup complete!${colors.reset}`)
    
    if (!ghInstalled) {
      console.log(`\n${colors.yellow}⚠️  Install GitHub CLI for easier repository creation${colors.reset}`)
    }
    
    showInstructions()
    
  } catch (error) {
    console.error(`${colors.red}❌ Setup failed: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { createREADME, updateMCPConfig }