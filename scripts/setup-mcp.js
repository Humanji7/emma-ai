#!/usr/bin/env node

/**
 * Setup MCP Servers for Emma AI
 * Инициализирует Context7, Sequential Thinking и другие MCP серверы
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Цветовые коды
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

console.log(`${colors.bold}${colors.cyan}`)
console.log(`╔══════════════════════════════════════╗`)
console.log(`║         Emma AI MCP Setup            ║`)
console.log(`║     Model Context Protocol Setup     ║`)
console.log(`╚══════════════════════════════════════╝`)
console.log(colors.reset)

// Проверить доступные MCP серверы
const availableServers = {
  'context7': {
    package: '@upstash/context7-mcp',
    description: 'Documentation and code patterns',
    port: 3001,
    installed: true
  },
  'sequential': {
    package: '@modelcontextprotocol/server-sequential-thinking', 
    description: 'Sequential thinking and problem solving',
    port: 3002,
    installed: true
  },
  'magic': {
    package: '@21st-dev/cli',
    description: 'UI component generation (21st.dev)',
    port: 3003,
    installed: true
  },
  'supabase': {
    package: 'mcp-server-supabase',
    description: 'Database operations (already running)',
    port: 3004,
    installed: false,
    external: true
  }
}

function checkInstallation() {
  console.log(`${colors.bold}📦 Checking MCP Server Installation${colors.reset}\n`)
  
  for (const [name, server] of Object.entries(availableServers)) {
    const packagePath = path.join(process.cwd(), 'node_modules', server.package)
    const exists = fs.existsSync(packagePath)
    
    if (exists) {
      console.log(`  ${colors.green}✅ ${name}${colors.reset} - ${server.description}`)
      server.installed = true
    } else if (server.external) {
      console.log(`  ${colors.blue}ℹ️  ${name}${colors.reset} - ${server.description}`)
    } else {
      console.log(`  ${colors.red}❌ ${name}${colors.reset} - ${server.description}`)
      server.installed = false
    }
  }
}

function generateMCPConfig() {
  console.log(`\n${colors.bold}⚙️  Generating MCP Configuration${colors.reset}\n`)
  
  const config = {
    mcpServers: {
      "context7": {
        "command": "npx",
        "args": ["@upstash/context7-mcp"],
        "description": "Documentation and patterns for Emma AI",
        "env": {
          "CONTEXT7_API_KEY": process.env.CONTEXT7_API_KEY || "your_context7_key"
        }
      },
      "sequential-thinking": {
        "command": "npx", 
        "args": ["@modelcontextprotocol/server-sequential-thinking"],
        "description": "Sequential analysis for Emma AI",
        "env": {}
      },
      "supabase": {
        "command": "npx",
        "args": ["@supabase/mcp-server-supabase", `--project-ref=${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'your-project-ref'}`],
        "description": "Emma AI database operations",
        "env": {
          "SUPABASE_URL": process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          "SUPABASE_ANON_KEY": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          "SUPABASE_SERVICE_ROLE_KEY": process.env.SUPABASE_SERVICE_KEY || ""
        }
      }
    }
  }
  
  // Сохранить конфигурацию
  const configPath = path.join(process.cwd(), 'mcp-config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  
  console.log(`  ${colors.green}✅ Configuration saved to mcp-config.json${colors.reset}`)
  
  // Также создать Claude Desktop config (если нужен)
  const claudeConfigDir = path.join(os.homedir(), '.config', 'claude-desktop')
  const claudeConfigPath = path.join(claudeConfigDir, 'claude_desktop_config.json')
  
  try {
    if (!fs.existsSync(claudeConfigDir)) {
      fs.mkdirSync(claudeConfigDir, { recursive: true })
    }
    
    fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2))
    console.log(`  ${colors.green}✅ Claude Desktop config updated${colors.reset}`)
  } catch (error) {
    console.log(`  ${colors.yellow}⚠️  Could not update Claude Desktop config: ${error.message}${colors.reset}`)
  }
}

function showUsageInstructions() {
  console.log(`\n${colors.bold}📋 Usage Instructions${colors.reset}\n`)
  
  console.log(`${colors.bold}For Emma AI Development:${colors.reset}`)
  console.log(`  1. ${colors.cyan}Context7${colors.reset} - Get documentation and code patterns`)
  console.log(`  2. ${colors.cyan}Sequential Thinking${colors.reset} - Complex problem solving`)
  console.log(`  3. ${colors.cyan}Supabase MCP${colors.reset} - Database operations`)
  
  console.log(`\n${colors.bold}MCP Server Status:${colors.reset}`)
  console.log(`  • Context7: ${availableServers.context7.installed ? `${colors.green}Ready` : `${colors.red}Not installed`}${colors.reset}`)
  console.log(`  • Sequential: ${availableServers.sequential.installed ? `${colors.green}Ready` : `${colors.red}Not installed`}${colors.reset}`)
  console.log(`  • Supabase: ${colors.blue}External (already running)${colors.reset}`)
  
  console.log(`\n${colors.bold}Next Steps:${colors.reset}`)
  console.log(`  1. Restart Claude Code to load MCP servers`)
  console.log(`  2. Use flags: --c7 (Context7), --seq (Sequential)`)
  console.log(`  3. Try: ${colors.cyan}"Analyze Emma AI architecture with Sequential thinking"${colors.reset}`)
}

// Основная функция
function main() {
  try {
    checkInstallation()
    generateMCPConfig()
    showUsageInstructions()
    
    console.log(`\n${colors.green}🎉 MCP Setup Complete!${colors.reset}`)
  } catch (error) {
    console.error(`${colors.red}❌ Setup failed: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

// Запуск
if (require.main === module) {
  main()
}

module.exports = { availableServers, generateMCPConfig }