import { CyberButton } from '../components/Shared.jsx'

export default function NotFound() {
  return (
    <div className="container center-col">
      <h1 className="hero-h">404</h1>
      <p className="lead center">Page not found. The page you are looking for does not exist or has been moved.</p>
      <CyberButton to="/">Return home</CyberButton>
    </div>
  )
}