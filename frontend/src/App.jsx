import { useChat } from './hooks/useChat'
import LandingPage from './components/LandingPage'
import ChatWindow from './components/ChatWindow'
import './index.css'

export default function App() {
  const chat = useChat()

  return (
    <div className="app">
      {chat.messages.length === 0
        ? <LandingPage onSend={chat.sendMessage} isStreaming={chat.isStreaming} />
        : <ChatWindow {...chat} />
      }
    </div>
  )
}
