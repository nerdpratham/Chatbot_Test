import { useState, useRef } from 'react'
import Navbar from './Navbar'
import './LandingPage.css'

const MODES = [
  { key: 'fast', label: 'Fast', icon: '⚡' },
  { key: 'indepth', label: 'In-depth', icon: '🔬' },
  { key: 'holistic', label: 'Holistic', icon: '✦' },
]

export default function LandingPage({ onSend, isStreaming }) {
  const [value, setValue] = useState('')
  const [mode, setMode] = useState('fast')
  const textareaRef = useRef(null)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handleInput = (e) => {
    setValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`
  }

  return (
    <div className="landing">
      <Navbar />
      <div className="landing-center">
        <h1 className="landing-title">Hi, I'm SixdX Chatbot</h1>
        <p className="landing-subtitle">How can I help you today?</p>

        <div className="landing-card">
          <textarea
            ref={textareaRef}
            className="landing-textarea"
            placeholder="Ask anything..."
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={isStreaming}
          />

          <div className="landing-toolbar">
            <div className="toolbar-left">
              <button className="tool-icon-btn" title="Attach file">
                <IconAttach />
              </button>
              <button className="tool-pill-btn">
                <IconSearch size={13} />
                Deep search
              </button>
              <button className="tool-pill-btn">
                <IconGlobe size={13} />
                Search
              </button>
            </div>

            <div className="toolbar-right">
              <button className="tool-icon-btn" title="Voice input">
                <IconBars />
              </button>
              <button
                className="send-round-btn"
                onClick={submit}
                disabled={!value.trim() || isStreaming}
                aria-label="Send"
              >
                <IconSend />
              </button>
            </div>
          </div>
        </div>

        <div className="mode-pills">
          {MODES.map(m => (
            <button
              key={m.key}
              className={`mode-pill ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
            >
              <span className="mode-icon">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function IconAttach() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48"/>
    </svg>
  )
}

function IconSearch({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

function IconGlobe({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
}

function IconBars() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="10" width="3" height="4" rx="1"/>
      <rect x="7" y="6" width="3" height="12" rx="1"/>
      <rect x="12" y="3" width="3" height="18" rx="1"/>
      <rect x="17" y="6" width="3" height="12" rx="1"/>
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  )
}
