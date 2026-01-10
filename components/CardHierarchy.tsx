
import React from 'react';
import { Rank } from '../types';

export const CardHierarchy: React.FC = () => {
  const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

  return (
    <div className="flex items-center gap-1 lg:gap-2 bg-black/60 px-3 py-1 rounded-full border border-slate-700 select-none backdrop-blur-sm">
      <span className="text-[10px] lg:text-xs text-slate-400 uppercase tracking-widest mr-1">Força:</span>
      {ranks.map((rank, i) => (
        <React.Fragment key={rank}>
          <span className={`
            font-pixel font-bold text-sm lg:text-base
            ${['A', 'K', 'Q', 'J'].includes(rank) ? 'text-balatro-gold' : 'text-slate-300'}
          `}>
            {rank}
          </span>
          {i < ranks.length - 1 && <span className="text-slate-600 text-[10px]">></span>}
        </React.Fragment>
      ))}
    </div>
  );
};
