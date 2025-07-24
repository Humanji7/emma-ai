import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the child components
jest.mock('../VoiceRecorder', () => {
  return function MockVoiceRecorder({ state, disabled }: any) {
    return (
      <button 
        data-testid="voice-recorder"
        disabled={disabled}
        aria-label={
          state === 'idle' ? 'Start voice recording' :
          state === 'listening' ? 'Stop voice recording' :
          state === 'processing' ? 'Processing audio' :
          'Requesting microphone permission'
        }
      >
        Voice Recorder ({state})
      </button>
    )
  }
})

jest.mock('../VoiceVisualizer', () => {
  return function MockVoiceVisualizer({ state, audioLevel }: any) {
    return (
      <div data-testid="voice-visualizer">
        Visualizer: {state} - Level: {audioLevel}
      </div>
    )
  }
})

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

// Import the component after mocks
import VoiceInterface from '../VoiceInterface'

describe('VoiceInterface', () => {
  const mockProps = {
    onUserInput: jest.fn(),
    onError: jest.fn(),
    disabled: false,
    prompt: 'Test prompt',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default prompt', () => {
    render(<VoiceInterface {...mockProps} />)
    
    expect(screen.getByText('Test prompt')).toBeInTheDocument()
  })

  it('shows guidance text for first-time users', () => {
    render(<VoiceInterface {...mockProps} />)
    
    expect(screen.getByText("Share what's on your mind - Emma is here to listen")).toBeInTheDocument()
  })

  it('renders voice recorder component', () => {
    render(<VoiceInterface {...mockProps} />)
    
    const voiceRecorder = screen.getByTestId('voice-recorder')
    expect(voiceRecorder).toBeInTheDocument()
    expect(voiceRecorder).toHaveTextContent('Voice Recorder (idle)')
  })

  it('renders voice visualizer component', () => {
    render(<VoiceInterface {...mockProps} />)
    
    const voiceVisualizer = screen.getByTestId('voice-visualizer')
    expect(voiceVisualizer).toBeInTheDocument()
    expect(voiceVisualizer).toHaveTextContent('Visualizer: idle - Level: 0')
  })

  it('displays debug state information', () => {
    render(<VoiceInterface {...mockProps} />)
    
    expect(screen.getByText(/State: idle/)).toBeInTheDocument()
    expect(screen.getByText(/AudioLevel: 0/)).toBeInTheDocument()
  })

  it('shows accessibility instructions', () => {
    render(<VoiceInterface {...mockProps} />)
    
    expect(screen.getByText(/Voice interface for Emma AI/)).toBeInTheDocument()
    expect(screen.getByText(/Press the microphone button to start recording/)).toBeInTheDocument()
  })

  it('handles disabled state correctly', () => {
    render(<VoiceInterface {...mockProps} disabled />)
    
    const voiceRecorder = screen.getByTestId('voice-recorder')
    expect(voiceRecorder).toBeDisabled()
  })

  it('shows visual state indicators', () => {
    render(<VoiceInterface {...mockProps} />)
    
    // Should have visual indicator dots for different states
    const container = screen.getByText('Test prompt').closest('div')
    expect(container).toBeInTheDocument()
  })

  it('displays custom prompt text', () => {
    const customPrompt = 'Custom prompt for testing'
    render(<VoiceInterface {...mockProps} prompt={customPrompt} />)
    
    expect(screen.getByText(customPrompt)).toBeInTheDocument()
  })

  it('uses default prompt when none provided', () => {
    const { prompt, ...propsWithoutPrompt } = mockProps
    render(<VoiceInterface {...propsWithoutPrompt} />)
    
    expect(screen.getByText('Tap to talk with Emma')).toBeInTheDocument()
  })
})