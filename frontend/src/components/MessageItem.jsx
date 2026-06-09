import ReactMarkdown from 'react-markdown'
import PropertyCard from './PropertyCard'
import './MessageItem.css'

export default function MessageItem({ message, isStreamingTarget }) {
  const isUser = message.role === 'user'
  const properties = message.properties ?? []

  return (
    <div className={`message-item ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-role">{isUser ? 'You' : 'Assistant'}</div>

      {(message.content || isStreamingTarget) && (
        <div className="message-bubble">
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
          {isStreamingTarget && <span className="cursor" />}
        </div>
      )}

      {properties.length > 0 && (
        <div className="property-grid">
          {properties.map(p => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  )
}
