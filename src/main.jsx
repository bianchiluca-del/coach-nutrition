import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './storage-shim.js'
import './index.css'
import App from './App.jsx'
import AuthGate from './components/AuthGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      {(session, profileId, nutritionProfile, accessContext) => <App session={session} accountProfileId={profileId} nutritionProfile={nutritionProfile} accessContext={accessContext} />}
    </AuthGate>
  </StrictMode>,
)
