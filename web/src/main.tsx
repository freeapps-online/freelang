import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerDevice } from './services/cloud.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Keep background network work off the critical path.
const warmBackgroundServices = () => {
  void registerDevice('Learner', 'en', 'es')
}

const requestIdle = 'requestIdleCallback' in window
  ? (window as Window & typeof globalThis & {
      requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    }).requestIdleCallback
  : null

if (requestIdle) {
  requestIdle(() => warmBackgroundServices(), { timeout: 2000 })
} else {
  setTimeout(warmBackgroundServices, 1000)
}
