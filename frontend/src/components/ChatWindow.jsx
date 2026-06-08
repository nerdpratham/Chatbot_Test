import { useRef, useEffect } from 'react'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import Navbar from './Navbar'
import './ChatWindow.css'

export default function ChatWindow({ messages, isStreaming, error, sendMessage, clearHistory }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-window">
      <Navbar onNewChat={clearHistory} />

      <div className="chat-body">
        <MessageList messages={messages} isStreaming={isStreaming} />
        {error && <div className="chat-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-wrap">
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  )
}
