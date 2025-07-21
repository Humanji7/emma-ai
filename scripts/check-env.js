#!/usr/bin/env node

/**
 * Environment Variables Checker for Emma AI
 * Validates all required API keys and configuration
 */

const fs = require('fs')
const path = require('path')

// Color codes for terminal output
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

// Required environment variables
const requiredVars = {
  critical: [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXTAUTH_SECRET'
  ],
  recommended: [
    'ELEVENLABS_API_KEY',
    'ELEVENLABS_VOICE_ID',
    'SUPABASE_SERVICE_KEY'
  ],
  optional: [
    'GOOGLE_CLOUD_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SENTRY_DSN',
    'CRISIS_WEBHOOK_URL'
  ]
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.red}❌ .env.local file not found!${colors.reset}`)
    console.log(`${colors.yellow}📋 Run: ${colors.cyan}cp .env.example .env.local${colors.reset}`)
    return false
  }
  
  console.log(`${colors.green}✅ .env.local file exists${colors.reset}`)
  return true
}

function loadEnvVars() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8')
    const envVars = {}
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })
    
    return envVars
  } catch (error) {
    console.log(`${colors.red}❌ Failed to read .env.local: ${error.message}${colors.reset}`)
    return {}
  }
}

function validateApiKey(key, value) {
  if (!value || value.includes('your_') || value.includes('ключ') || value.includes('here')) {
    return false
  }
  
  // More flexible validation patterns
  const patterns = {
    'OPENAI_API_KEY': /^sk-[A-Za-z0-9_-]{20,}$/,
    'ELEVENLABS_API_KEY': /^[a-zA-Z0-9]{20,}$/,
    'NEXT_PUBLIC_SUPABASE_URL': /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/,
    'NEXTAUTH_SECRET': /^.{20,}$/,
    'ELEVENLABS_VOICE_ID': /^[A-Za-z0-9]{15,}$/
  }
  
  if (patterns[key]) {
    return patterns[key].test(value)
  }
  
  return value.length > 8 // Basic length check
}

function checkVariables(envVars) {
  let criticalCount = 0
  let recommendedCount = 0
  let optionalCount = 0
  
  console.log(`\n${colors.bold}🔍 Checking Environment Variables${colors.reset}\n`)
  
  // Check critical variables
  console.log(`${colors.bold}${colors.red}Critical Variables:${colors.reset}`)
  requiredVars.critical.forEach(varName => {
    const value = envVars[varName]
    const isValid = validateApiKey(varName, value)
    
    if (isValid) {
      console.log(`  ${colors.green}✅ ${varName}${colors.reset}`)
      criticalCount++
    } else if (value) {
      console.log(`  ${colors.yellow}⚠️  ${varName} (invalid format)${colors.reset}`)
    } else {
      console.log(`  ${colors.red}❌ ${varName} (missing)${colors.reset}`)
    }
  })
  
  // Check recommended variables
  console.log(`\n${colors.bold}${colors.yellow}Recommended Variables:${colors.reset}`)
  requiredVars.recommended.forEach(varName => {
    const value = envVars[varName]
    const isValid = validateApiKey(varName, value)
    
    if (isValid) {
      console.log(`  ${colors.green}✅ ${varName}${colors.reset}`)
      recommendedCount++
    } else if (value) {
      console.log(`  ${colors.yellow}⚠️  ${varName} (invalid format)${colors.reset}`)
    } else {
      console.log(`  ${colors.yellow}⚠️  ${varName} (missing)${colors.reset}`)
    }
  })
  
  // Check optional variables
  console.log(`\n${colors.bold}${colors.blue}Optional Variables:${colors.reset}`)
  requiredVars.optional.forEach(varName => {
    const value = envVars[varName]
    
    if (value && !value.includes('your_')) {
      console.log(`  ${colors.green}✅ ${varName}${colors.reset}`)
      optionalCount++
    } else {
      console.log(`  ${colors.blue}ℹ️  ${varName} (optional)${colors.reset}`)
    }
  })
  
  return { criticalCount, recommendedCount, optionalCount }
}

function generateReport(counts) {
  const { criticalCount, recommendedCount, optionalCount } = counts
  const totalCritical = requiredVars.critical.length
  const totalRecommended = requiredVars.recommended.length
  
  console.log(`\n${colors.bold}📊 Configuration Report${colors.reset}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━`)
  
  // Critical status
  if (criticalCount === totalCritical) {
    console.log(`${colors.green}✅ Critical: ${criticalCount}/${totalCritical} configured${colors.reset}`)
  } else {
    console.log(`${colors.red}❌ Critical: ${criticalCount}/${totalCritical} configured${colors.reset}`)
  }
  
  // Recommended status
  if (recommendedCount === totalRecommended) {
    console.log(`${colors.green}✅ Recommended: ${recommendedCount}/${totalRecommended} configured${colors.reset}`)
  } else {
    console.log(`${colors.yellow}⚠️  Recommended: ${recommendedCount}/${totalRecommended} configured${colors.reset}`)
  }
  
  // Optional status
  console.log(`${colors.blue}ℹ️  Optional: ${optionalCount}/${requiredVars.optional.length} configured${colors.reset}`)
  
  // Overall status
  const canStart = criticalCount === totalCritical
  console.log(`\n${colors.bold}Status: ${canStart ? `${colors.green}Ready to start` : `${colors.red}Configuration incomplete`}${colors.reset}`)
  
  if (canStart) {
    console.log(`${colors.green}🚀 Run: ${colors.cyan}npm run dev${colors.reset}`)
    console.log(`${colors.green}🌐 Test: ${colors.cyan}http://localhost:3000/test${colors.reset}`)
  } else {
    console.log(`${colors.yellow}📋 Please configure missing critical variables${colors.reset}`)
    console.log(`${colors.cyan}💡 Guide: setup-apis.md${colors.reset}`)
  }
}

function main() {
  console.log(`${colors.bold}${colors.cyan}`)
  console.log(`╔══════════════════════════════════════╗`)
  console.log(`║           Emma AI Setup              ║`)
  console.log(`║       Environment Checker            ║`)
  console.log(`╚══════════════════════════════════════╝`)
  console.log(colors.reset)
  
  // Check if .env.local exists
  if (!checkEnvFile()) {
    process.exit(1)
  }
  
  // Load and validate environment variables
  const envVars = loadEnvVars()
  const counts = checkVariables(envVars)
  
  // Generate final report
  generateReport(counts)
  
  // Exit with appropriate code
  const canStart = counts.criticalCount === requiredVars.critical.length
  process.exit(canStart ? 0 : 1)
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { checkEnvFile, loadEnvVars, validateApiKey, checkVariables }