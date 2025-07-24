// Simple test script for couple mode API
const fetch = require('node-fetch')

async function testCoupleAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': 'test-session-123',
        'x-user-id': 'test-user-456'
      },
      body: JSON.stringify({
        message: 'We keep having the same argument over and over again.',
        coupleMode: true,
        speaker: 'A',
        conflictLevel: 3,
        emotionalTone: 'frustrated',
        conversationHistory: [
          {
            id: '1',
            text: 'This always happens when we try to talk about money.',
            speaker: 'B',
            timestamp: new Date().toISOString(),
            conflictLevel: 2,
            emotionalTone: 'defensive'
          }
        ]
      })
    })

    const result = await response.json()
    
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (result.metadata?.coupleMode) {
      console.log('✅ Couple mode API working correctly')
      console.log('Conflict Level:', result.metadata.conflictAnalysis?.currentLevel)
      console.log('Intervention:', result.metadata.interventionRecommendation?.type)
    } else {
      console.log('❌ Couple mode not detected in response')
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message)
  }
}

if (require.main === module) {
  testCoupleAPI()
}

module.exports = { testCoupleAPI }