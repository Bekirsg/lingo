import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initAudioUnlock } from './audio/sound'

// İlk kullanıcı etkileşiminde WebAudio kilidini aç
initAudioUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
