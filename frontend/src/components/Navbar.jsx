import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">SixdX Chatbot</span>

      <div className="navbar-links">
        <a href="#" className="nav-link">Features</a>
        <a href="#" className="nav-link">Pricing</a>
        <a href="#" className="nav-link">Docs</a>
      </div>

      <div className="navbar-actions">
        <button className="btn-login">Log in</button>
        <button className="btn-signup">Sign up</button>
      </div>
    </nav>
  )
}
