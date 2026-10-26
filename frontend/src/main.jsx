import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import { SettingsProvider } from './settings.jsx'
import { AuthProvider } from './auth.jsx'
import './styles.css'

const googleId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const tree = (
  <SettingsProvider>
    <AuthProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AuthProvider>
  </SettingsProvider>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleId ? <GoogleOAuthProvider clientId={googleId}>{tree}</GoogleOAuthProvider> : tree}
  </React.StrictMode>
)
