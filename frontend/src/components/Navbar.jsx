import './Navbar.css'

export default function Navbar({ onNewChat }) {
  return (
    <nav className="navbar">
      <span className="navbar-brand">SixdX Chatbot</span>

      <div className="navbar-links">
        <a href="#" className="nav-link">Features</a>
        <a href="#" className="nav-link">Pricing</a>
        <a href="#" className="nav-link">Docs</a>
      </div>

      <div className="navbar-actions">
        {onNewChat && (
          <button className="new-chat-btn" onClick={onNewChat}>
            + New chat
          </button>
        )}
      </div>
    </nav>
  )
}
