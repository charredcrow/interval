import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// PWA: register service worker (auto-update when new build is deployed)
registerSW({ immediate: true })

// Apply theme on initial load
const storedTheme = localStorage.getItem('interval-ui-storage')
if (storedTheme) {
  try {
    const parsed = JSON.parse(storedTheme)
    if (parsed.state?.theme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch (e) {
    // Ignore parse errors
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
