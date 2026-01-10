
import React, { useState } from 'react';
import { playSound, initSounds } from '../services/soundService';
import { Language } from '../types';
import { t } from '../services/i18n';
import { BookOpen, Wifi, WifiOff } from 'lucide-react';

interface MainMenuProps {
  onEnter: (name: string, mode: 'online' | 'offline') => void;
  onStartTutorial: () => void;
  lang: Language;
  setLang: (l: Language) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onEnter, onStartTutorial, lang, setLang }) => {
  const [name, setName] = useState('');

  const handleStart = (mode: 'online' | 'offline') => {
    if (!name.trim()) return;
    initSounds();
    playSound('bid');
    onEnter(name, mode);
  };

  const handleTutorial = () => {
    initSounds();
    playSound('flip');
    onStartTutorial();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full z-20 font-pixel relative">
      
      <div className="absolute top-4 right-4 flex gap-2 z-50">
          {(['pt', 'en', 'es'] as Language[]).map((l) => (
             <button 
                key={l}
                onClick={() => { playSound('flip'); setLang(l); }}
                className={`w-10 h-8 rounded border-2 font-bold uppercase ${lang === l ? 'bg-balatro-gold text-black border-white' : 'bg-slate-800 text-slate-400 border-slate-600'}`}
             >
                {l}
             </button>
          ))}
      </div>

      <div className="bg-balatro-panel border-4 border-slate-600 p-8 rounded-2xl shadow-[10px_10px_0_rgba(0,0,0,0.5)] max-w-md w-full text-center relative overflow-hidden animate-in zoom-in duration-300">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-balatro-red via-balatro-blue to-balatro-gold"></div>

        <h1 className="text-6xl text-white mb-2 drop-shadow-[4px_4px_0_#000]">{t(lang, 'gameTitle')}</h1>
        <p className="text-balatro-blue text-xl mb-8 uppercase tracking-widest">Multiplayer Edition</p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder={t(lang, 'enterName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart('online')}
            className="bg-slate-900 border-2 border-slate-500 text-white text-2xl p-3 rounded text-center focus:border-balatro-gold outline-none placeholder:text-slate-600 uppercase"
            maxLength={12}
            autoFocus
          />
          
          <div className="flex gap-2">
              <button
                onClick={() => handleStart('online')}
                disabled={!name}
                className="flex-1 bg-balatro-blue text-white text-xl py-3 rounded border-b-8 border-blue-900 hover:brightness-110 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase flex items-center justify-center gap-2 font-bold"
              >
                <Wifi size={20} /> {t(lang, 'playOnline')}
              </button>
              
              <button
                onClick={() => handleStart('offline')}
                disabled={!name}
                className="flex-1 bg-slate-700 text-white text-xl py-3 rounded border-b-8 border-slate-900 hover:brightness-110 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase flex items-center justify-center gap-2 font-bold"
              >
                <WifiOff size={20} /> {t(lang, 'playOffline')}
              </button>
          </div>

          <button
            onClick={handleTutorial}
            className="mt-2 bg-slate-800 text-balatro-gold text-xl py-2 rounded border-2 border-slate-500 hover:bg-slate-700 transition-colors uppercase flex items-center justify-center gap-2"
          >
            <BookOpen size={20} /> {t(lang, 'tutorial')}
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-slate-500 text-sm">
        v0.3.1 // Firebase Spark
      </div>
    </div>
  );
};
