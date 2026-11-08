import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { aplicarTema, temaInicial } from './shared'
import './shared/styles/tokens.css'

aplicarTema(temaInicial(window.matchMedia('(prefers-color-scheme: dark)').matches))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
