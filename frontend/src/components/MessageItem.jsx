import ReactMarkdown from 'react-markdown'
import './MessageItem.css'

export default function MessageItem({ message, isStreamingTarget }) {
  const isUser = message.role === 'user'

  return (
    <div className={`message-item ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-role">{isUser ? 'You' : 'Assistant'}</div>
      <div className="message-bubble">
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
        {isStreamingTarget && <span className="cursor" />}
      </div>
    </div>
  )
}
