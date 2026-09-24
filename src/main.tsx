import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { NoticeProvider } from './components/ui/Notice';
import { I18nProvider } from './i18n';
import { unlockAudio } from './lib/sound';
import './index.css';

// Áudio só pode começar após um gesto do usuário (e o iOS suspende ao trocar de app).
window.addEventListener('pointerdown', unlockAudio, { passive: true });

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <NoticeProvider>
        <App />
      </NoticeProvider>
    </I18nProvider>
  </StrictMode>,
);
