import React from 'react';
import { Joker } from '../types';

interface JokerProps {
  joker: Joker;
}

export const JokerCard: React.FC<JokerProps> = ({ joker }) => {
  const rarityColors = {
    common: 'border-slate-500 bg-slate-700',
    uncommon: 'border-green-500 bg-green-900',
    rare: 'border-balatro-red bg-red-900',
    legendary: 'border-balatro-gold bg-yellow-900',
  };

  return (
    <div className={`
      relative w-20 h-28 sm:w-24 sm:h-32 
      flex flex-col items-center justify-center 
      border-4 rounded-lg 
      shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
      transition-transform hover:scale-105
      ${rarityColors[joker.rarity]}
      text-white font-pixel
      cursor-help group
    `}>
      <div className="text-4xl animate-card-float">{joker.imageType}</div>
      <div className="text-xs text-center mt-2 px-1 leading-none font-bold uppercase drop-shadow-md">
        {joker.name}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-48 bg-slate-900 border-2 border-white p-2 rounded shadow-xl pointer-events-none">
        <p className="text-balatro-red font-bold text-sm mb-1">{joker.name}</p>
        <p className="text-white text-xs">{joker.description}</p>
        <p className="text-slate-400 text-[10px] mt-1 uppercase">{joker.rarity}</p>
      </div>
    </div>
  );
};