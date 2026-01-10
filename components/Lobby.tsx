import React, { useState } from 'react';

interface LobbyProps {
  onJoin: (name: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleJoin = () => {
    if (!name.trim()) return;
    setIsSearching(true);
    // Simulate finding a match
    setTimeout(() => {
      onJoin(name);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full z-20 font-pixel p-4">
      <div className="bg-balatro-panel border-4 border-slate-600 p-4 sm:p-8 rounded-2xl shadow-[10px_10px_0_rgba(0,0,0,0.5)] max-w-md w-full text-center relative overflow-hidden">
        
        {/* Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-balatro-red via-balatro-blue to-balatro-gold"></div>

        <h1 className="text-4xl sm:text-6xl text-white mb-2 drop-shadow-[4px_4px_0_#000]">PROGNOSTICO</h1>
        <p className="text-balatro-blue text-lg sm:text-xl mb-6 sm:mb-8 uppercase tracking-widest">Multiplayer Edition</p>

        {!isSearching ? (
          <div className="flex flex-col gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="ENTER NAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-900 border-2 border-slate-500 text-white text-xl sm:text-2xl p-2 sm:p-3 rounded text-center focus:border-balatro-gold outline-none placeholder:text-slate-600"
              maxLength={12}
            />
            <button
              onClick={handleJoin}
              disabled={!name}
              className="bg-balatro-red text-white text-2xl sm:text-3xl py-2 sm:py-3 rounded border-b-4 sm:border-b-8 border-red-900 hover:brightness-110 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              PLAY
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 border-8 border-balatro-blue border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white text-2xl animate-pulse">SEARCHING FOR OPPONENT...</p>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-4 text-slate-500 text-sm">
        v0.1.0-alpha // SKELETON BUILD
      </div>
    </div>
  );
};