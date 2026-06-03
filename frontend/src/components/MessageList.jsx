import MessageItem from './MessageItem'
import './MessageList.css'

export default function MessageList({ messages, isStreaming }) {
  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <p>Send a message to start the conversation.</p>
      </div>
    )
  }

  return (
    <div className="message-list">
      {messages.map((msg, i) => (
        <MessageItem
          key={msg.id ?? i}
          message={msg}
          isStreamingTarget={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
        />
      ))}
    </div>
  )
}
