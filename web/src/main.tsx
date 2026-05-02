import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadLevel } from './services/vocabulary.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Preload all vocab levels in the background so they're cached for offline use
setTimeout(() => {
  for (let i = 1; i <= 5; i++) loadLevel(i)
}, 2000)
