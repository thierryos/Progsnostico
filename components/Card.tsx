
import React from 'react';
import { Card as CardType } from '../types';
import { Heart, Diamond, Club, Spade } from 'lucide-react';
import { playSound } from '../services/soundService';

interface CardProps {
  card?: CardType;
  onClick?: () => void;
  small?: boolean;
  isFaceDown?: boolean;
}

export const CardComponent: React.FC<CardProps> = ({ card, onClick, small = false, isFaceDown = false }) => {
  
  const handleMouseEnter = () => {
    if (!isFaceDown) {
       playSound('hover');
    }
  };

  if (isFaceDown || !card) {
     const sizeClasses = small 
      ? "w-16 h-24 rounded-md border-2" 
      : "w-24 h-36 lg:w-32 lg:h-48 rounded-xl border-4";
      
     return (
       <div className={`
         ${sizeClasses}
         bg-balatro-red
         border-white
         shadow-lg
         flex items-center justify-center
         relative
         overflow-hidden
         border-opacity-90
       `}>
          <div className="absolute inset-2 border-2 border-dashed border-red-900 opacity-50 rounded-lg"></div>
          <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-black to-transparent"></div>
          <div className="text-red-900 opacity-80 font-pixel text-4xl font-bold">J</div>
       </div>
     );
  }

  const SuitIcon = {
    hearts: Heart,
    diamonds: Diamond,
    clubs: Club,
    spades: Spade,
  }[card.suit];

  const textColor = (card.suit === 'hearts' || card.suit === 'diamonds') ? 'text-red-600' : 'text-slate-900';

  const sizeClasses = small 
    ? "w-20 h-28 text-xl border-2"
    : "w-28 h-40 lg:w-40 lg:h-56 text-4xl border-2"; 

  const selectedTransform = card.isSelected 
    ? "-translate-y-12 rotate-0 z-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-4 ring-balatro-gold" 
    : "hover:-translate-y-4 hover:rotate-1 hover:z-10 hover:shadow-2xl";

  return (
    <div 
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      className={`
        relative 
        ${sizeClasses} 
        ${selectedTransform}
        bg-white
        rounded-xl
        flex flex-col items-center justify-between 
        p-2 lg:p-4
        border-slate-300
        shadow-[2px_2px_5px_rgba(0,0,0,0.3)] 
        cursor-pointer 
        transition-all duration-200 ease-out
        select-none
        font-pixel font-bold tracking-widest
      `}
    >
      <div className={`self-start flex flex-col items-center leading-none ${textColor}`}>
        <span className="mb-1">{card.rank}</span>
        <SuitIcon size={small ? 14 : 24} fill="currentColor" />
      </div>

      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${textColor}`}>
        <SuitIcon size={small ? 32 : 64} fill="currentColor" />
      </div>

      <div className={`self-end flex flex-col items-center rotate-180 leading-none ${textColor}`}>
        <span className="mb-1">{card.rank}</span>
        <SuitIcon size={small ? 14 : 24} fill="currentColor" />
      </div>
    </div>
  );
};
