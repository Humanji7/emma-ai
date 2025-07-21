#!/usr/bin/env node

/**
 * Quick environment check without strict validation
 */

const fs = require('fs')
const path = require('path')

// Color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

// Check .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.log(`${colors.red}❌ .env.local not found!${colors.reset}`)
  process.exit(1)
}

// Read environment variables
const envContent = fs.readFileSync('.env.local', 'utf8')
const envVars = {}

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    const value = valueParts.join('=').trim()
    // Remove quotes if present
    envVars[key.trim()] = value.replace(/^["']|["']$/g, '')
  }
})

console.log(`${colors.bold}${colors.blue}Emma AI - Quick Environment Check${colors.reset}\n`)

// Check critical variables
const critical = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL', 
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXTAUTH_SECRET'
]

const recommended = [
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID',
  'SUPABASE_SERVICE_KEY'
]

console.log(`${colors.bold}Critical Variables:${colors.reset}`)
critical.forEach(key => {
  const value = envVars[key]
  if (value && value.length > 10 && !value.includes('your_') && !value.includes('here')) {
    console.log(`  ${colors.green}✅ ${key}${colors.reset} (${value.substring(0, 10)}...)`)
  } else {
    console.log(`  ${colors.red}❌ ${key}${colors.reset}`)
  }
})

console.log(`\n${colors.bold}Recommended Variables:${colors.reset}`)
recommended.forEach(key => {
  const value = envVars[key]
  if (value && value.length > 10 && !value.includes('your_') && !value.includes('here')) {
    console.log(`  ${colors.green}✅ ${key}${colors.reset} (${value.substring(0, 10)}...)`)
  } else {
    console.log(`  ${colors.yellow}⚠️  ${key}${colors.reset}`)
  }
})

// Check if we can start
const hasAllCritical = critical.every(key => {
  const value = envVars[key]
  return value && value.length > 10 && !value.includes('your_') && !value.includes('here')
})

console.log(`\n${colors.bold}Status:${colors.reset} ${hasAllCritical ? colors.green + '✅ Ready to start!' : colors.red + '❌ Missing critical variables'}${colors.reset}`)

if (hasAllCritical) {
  console.log(`\n${colors.green}🚀 Run: ${colors.blue}npm run dev${colors.reset}`)
  console.log(`${colors.green}🌐 Then open: ${colors.blue}http://localhost:3000/test${colors.reset}`)
}