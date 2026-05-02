import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadLevel } from './services/vocabulary.ts'
import { registerDevice } from './services/cloud.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register anonymous device + preload vocab
setTimeout(() => {
  void registerDevice('Learner', 'en', 'es')
  for (let i = 1; i <= 20; i++) loadLevel(i)
}, 1000)
