import '@testing-library/jest-dom'

// Mock Web Audio API for testing
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
  }),
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  close: jest.fn(),
  state: 'running',
}))

global.webkitAudioContext = global.AudioContext

// Mock MediaRecorder API
global.MediaRecorder = jest.fn().mockImplementation((stream, options) => ({
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  ondataavailable: null,
  onstop: null,
  onerror: null,
  state: 'inactive',
  stream,
  mimeType: options?.mimeType || 'audio/webm',
}))

global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true)

// Mock getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([
        { stop: jest.fn(), kind: 'audio' }
      ]),
    }),
  },
  configurable: true,
})

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    protocol: 'https:',
  },
  writable: true,
})

// Mock isSecureContext
Object.defineProperty(window, 'isSecureContext', {
  value: true,
  writable: true,
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = jest.fn()

// Silence console errors during tests unless explicitly needed
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' && 
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})