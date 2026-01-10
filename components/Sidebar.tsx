
import React from 'react';
import { GameState, Language } from '../types';
import { Trophy, Target } from 'lucide-react';
import { t } from '../services/i18n';

interface SidebarProps {
  state: GameState;
  lang: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, lang }) => {
  return (
    <div id="scoreboard" className="w-full h-auto lg:w-72 lg:h-full bg-[#1a1c23] border-b-4 lg:border-b-0 lg:border-r-4 border-slate-800 flex flex-row lg:flex-col p-2 lg:p-4 gap-4 shrink-0 font-pixel z-30 shadow-2xl relative transition-all">
      
      <div className="hidden lg:flex flex-col gap-2 bg-slate-900/50 p-4 rounded-xl border-2 border-slate-700 text-center shadow-inner shrink-0">
        <div className="text-slate-400 text-lg uppercase tracking-widest border-b border-slate-700 pb-1 mb-2">
            {t(lang, 'round')} {state.round} / {state.totalRounds}
        </div>
        <div className="text-balatro-gold text-sm uppercase">{t(lang, 'currentPhase')}</div>
        <div className="text-white text-xl uppercase font-bold animate-pulse">
            {state.status === 'bidding' ? t(lang, 'phaseBidding') : state.status === 'trick_summary' ? t(lang, 'phaseSummary') : t(lang, 'phasePlaying')}
        </div>
      </div>

      <div className="hidden lg:block text-center text-slate-500 text-sm uppercase tracking-[0.2em] mt-2 mb-1 shrink-0">{t(lang, 'scoreboard')}</div>

      <div className="flex-1 w-full flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto no-scrollbar min-h-0">
        {state.players.map((p, idx) => {
          const isTurn = state.currentTurn === p.id;
          const bid = p.currentBid ?? 0;
          const won = p.tricksWon;
          
          let wonColor = 'text-white';
          if (p.currentBid !== null) {
              if (won === bid) wonColor = 'text-green-400';
              else if (won > bid) wonColor = 'text-red-500';
              else wonColor = 'text-balatro-gold';
          }

          return (
            <div key={p.id} className={`
              relative min-w-[140px] lg:w-full p-2 lg:p-3 rounded-xl border-4 transition-all duration-300 flex flex-col justify-between shadow-lg shrink-0
              ${p.isLocal ? 'bg-slate-800 border-balatro-blue' : 'bg-slate-900 border-slate-700'}
              ${isTurn ? 'border-l-[12px] border-balatro-gold bg-slate-800 z-10' : ''}
              ${p.isReady && state.status === 'trick_summary' ? 'opacity-50 grayscale' : 'opacity-100'}
            `}>
              
              <div className="flex justify-between items-end border-b-2 border-slate-700/50 pb-2 mb-2">
                <span className={`text-lg lg:text-xl leading-none truncate max-w-[65%] ${p.isLocal ? 'text-white font-bold tracking-wider' : 'text-slate-400'}`}>
                  {p.name}
                </span>
                <span className="text-balatro-blue font-bold text-xl lg:text-2xl drop-shadow-sm">{p.score}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center bg-black/30 rounded-lg p-2">
                 <div className="flex flex-col items-center border-r border-slate-600">
                   <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase mb-1">
                      <Target size={10} /> {t(lang, 'bid')}
                   </div>
                   <span className="text-xl lg:text-2xl font-bold text-white leading-none">
                     {p.currentBid !== null ? p.currentBid : '-'}
                   </span>
                 </div>
                 <div className="flex flex-col items-center">
                   <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase mb-1">
                      <Trophy size={10} /> {t(lang, 'won')}
                   </div>
                   <span className={`text-xl lg:text-2xl font-bold leading-none ${wonColor}`}>
                     {p.tricksWon}
                   </span>
                 </div>
              </div>

              <div className="hidden lg:block text-center mt-1">
                  {p.currentBid !== null && (
                      <span className={`text-[10px] font-bold uppercase ${won === bid ? 'text-green-500' : won > bid ? 'text-red-500' : 'text-slate-500'}`}>
                          {won === bid ? t(lang, 'onSpot') : won > bid ? t(lang, 'busted') : t(lang, 'seeking')}
                      </span>
                  )}
                  {state.status === 'trick_summary' && p.isReady && (
                      <div className="text-[10px] text-green-400 uppercase font-bold mt-1">OK</div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
