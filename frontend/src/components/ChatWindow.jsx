import { useRef, useEffect } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { useChat } from '../hooks/useChat'
import './ChatWindow.css'

export default function ChatWindow() {
  const { messages, isStreaming, error, sendMessage, clearHistory } = useChat()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-window">
      <header className="chat-header">
        <span className="chat-title">AI Assistant</span>
        <button className="clear-btn" onClick={clearHistory} title="Clear conversation">
          Clear
        </button>
      </header>

      <div className="chat-body">
        <MessageList messages={messages} isStreaming={isStreaming} />
        {error && <div className="chat-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}
