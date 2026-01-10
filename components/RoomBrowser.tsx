
import React, { useState, useEffect } from 'react';
import { RoomConfig, Language } from '../types';
import { Lock, User, Plus, LogIn, ArrowLeft, Info } from 'lucide-react';
import { playSound } from '../services/soundService';
import { t } from '../services/i18n';
import { listOpenRooms, cleanupInactiveRooms } from '../services/firebase';

interface RoomBrowserProps {
  playerName: string;
  lang: Language;
  onJoinRoom: (roomId: string, password?: string) => void;
  onCreateRoom: (config: Partial<RoomConfig>) => void;
  onBack: () => void;
  isOfflineMode: boolean;
}

export const RoomBrowser: React.FC<RoomBrowserProps> = ({ playerName, lang, onJoinRoom, onCreateRoom, onBack, isOfflineMode }) => {
  const [view, setView] = useState<'list' | 'create'>(isOfflineMode ? 'create' : 'list');
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [newRoomName, setNewRoomName] = useState(`Mesa de ${playerName}`);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [gameMode, setGameMode] = useState<'up' | 'up_down'>('up');
  const [roundsLimit, setRoundsLimit] = useState<number>(0);

  // Dynamic Max Card Calculation
  const absoluteMaxCards = Math.floor(52 / maxPlayers);

  // Auto-adjust limit if players increase beyond card capacity
  useEffect(() => {
      if (roundsLimit > absoluteMaxCards && roundsLimit !== 0) {
          setRoundsLimit(absoluteMaxCards);
      }
  }, [maxPlayers, absoluteMaxCards, roundsLimit]);

  // Listen to open rooms from Firebase
  useEffect(() => {
      if (!isOfflineMode) {
          // Limpar salas inativas ao abrir o lobby
          cleanupInactiveRooms().then(count => {
              if (count > 0) {
                  console.log(`🧹 ${count} sala(s) inativa(s) removida(s)`);
              }
          });
          
          const unsubscribe = listOpenRooms(setRooms);
          return unsubscribe;
      }
  }, [isOfflineMode]);

  const handleCreate = () => {
    if (isPrivate && !password.trim()) {
        alert(t(lang, 'passwordRequired'));
        return;
    }
    playSound('bid');
    onCreateRoom({
        name: newRoomName,
        isPrivate,
        password: isPrivate ? password : undefined,
        maxPlayers: maxPlayers,
        gameMode: gameMode,
        maxHandSize: roundsLimit,
    });
  };

  const handleJoinAttempt = (room: RoomConfig) => {
      playSound('bid');
      if (room.isPrivate) {
          const pass = prompt(`Digite a senha para entrar em: ${room.name}`);
          if (pass) {
              onJoinRoom(room.id, pass);
          }
      } else {
          onJoinRoom(room.id);
      }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 lg:p-12 font-pixel">
      
      <div className="w-full max-w-5xl h-full bg-[#1a1c23] border-4 border-slate-600 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="bg-slate-900 p-6 border-b-4 border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => { playSound('bid'); onBack(); }}
                    className="bg-slate-800 p-2 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-600"
                >
                    <ArrowLeft />
                </button>
                <div>
                    <h1 className="text-4xl text-white mb-1">{isOfflineMode ? t(lang, 'createRoom') : 'LOBBY'}</h1>
                    <p className="text-balatro-gold text-lg">{playerName}</p>
                </div>
            </div>
            {!isOfflineMode && view === 'list' && (
                <button 
                    onClick={() => { playSound('bid'); setView('create'); }}
                    className="flex items-center gap-2 bg-balatro-blue text-white px-6 py-3 rounded border-b-4 border-blue-900 hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all"
                >
                    <Plus size={20} /> {t(lang, 'createRoom')}
                </button>
            )}
            {!isOfflineMode && view === 'create' && (
                <button 
                    onClick={() => { playSound('bid'); setView('list'); }}
                    className="text-slate-400 hover:text-white underline"
                >
                    {t(lang, 'back')}
                </button>
            )}
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-[#111] relative">
            
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            {view === 'list' && !isOfflineMode ? (
                <div className="grid grid-cols-1 gap-4 relative z-10">
                    {rooms.map(room => {
                        const isFull = room.players.length >= room.maxPlayers;
                        const canJoin = !isFull;
                        
                        return (
                            <div key={room.id} className="bg-slate-800 border-2 border-slate-600 p-4 rounded flex justify-between items-center hover:bg-slate-700 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${room.status === 'open' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                        {room.isPrivate ? <Lock size={20} /> : <User size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-white text-2xl leading-none">{room.name}</h3>
                                        <span className={`text-sm uppercase ${room.status === 'open' ? 'text-green-500' : 'text-red-500'}`}>
                                            {room.status === 'open' ? 'Aberto' : 'Em Andamento'} • {room.players.length} / {room.maxPlayers} Jogadores • {room.gameMode === 'up' ? 'Subindo' : 'Sobe/Desce'}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleJoinAttempt(room)}
                                    disabled={!canJoin}
                                    className="px-6 py-2 bg-balatro-gold text-black font-bold text-xl rounded disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                >
                                    {isFull ? 'LOTADO' : room.status === 'playing' ? 'ASSISTIR' : 'ENTRAR'}
                                </button>
                            </div>
                        );
                    })}
                    {rooms.length === 0 && <div className="text-center text-slate-500 mt-20 text-2xl">Nenhuma sala encontrada. Crie uma!</div>}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto bg-slate-800 border-2 border-slate-600 p-8 rounded-xl relative z-10 shadow-lg animate-in zoom-in-95 duration-200">
                    <h2 className="text-white text-3xl mb-6 border-b border-slate-600 pb-2">{t(lang, 'settings')}</h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-slate-400 mb-1 uppercase text-sm">{t(lang, 'roomName')}</label>
                            <input 
                                type="text" 
                                value={newRoomName} 
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="w-full bg-black border border-slate-500 text-white p-3 rounded focus:border-balatro-gold outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-400 mb-1 uppercase text-sm">{t(lang, 'maxPlayers')}: {maxPlayers}</label>
                            <input 
                                type="range" 
                                min="2" max="7" 
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                                className="w-full accent-balatro-blue h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>2</span><span>7</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 mb-1 uppercase text-sm">
                                {t(lang, 'cardsPerHand')}: {roundsLimit === 0 ? `Máx (${absoluteMaxCards})` : roundsLimit}
                            </label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="range" 
                                    min="0" max={absoluteMaxCards} 
                                    value={roundsLimit}
                                    onChange={(e) => setRoundsLimit(parseInt(e.target.value))}
                                    className="flex-1 accent-balatro-gold h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                                0 = {t(lang, 'maxDeck')} (aprox {absoluteMaxCards} cartas).
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <label className={`flex-1 p-3 border-2 rounded cursor-pointer transition-colors relative group ${gameMode === 'up' ? 'bg-balatro-blue border-white text-white' : 'bg-slate-900 border-slate-600 text-slate-400'}`}>
                                <input 
                                    type="radio" 
                                    name="mode"
                                    className="hidden" 
                                    checked={gameMode === 'up'} 
                                    onChange={() => setGameMode('up')} 
                                />
                                <div className="font-bold text-lg flex items-center justify-between">
                                    {t(lang, 'modeClassic')}
                                    <Info size={16} />
                                </div>
                                <div className="text-xs opacity-70">1 → Máx</div>
                                
                                <div className="absolute bottom-full mb-2 left-0 w-64 bg-black border border-white p-2 rounded hidden group-hover:block z-50 text-xs text-white">
                                    {t(lang, 'modeClassicDesc')}
                                </div>
                            </label>

                            <label className={`flex-1 p-3 border-2 rounded cursor-pointer transition-colors relative group ${gameMode === 'up_down' ? 'bg-balatro-blue border-white text-white' : 'bg-slate-900 border-slate-600 text-slate-400'}`}>
                                <input 
                                    type="radio" 
                                    name="mode"
                                    className="hidden" 
                                    checked={gameMode === 'up_down'} 
                                    onChange={() => setGameMode('up_down')} 
                                />
                                <div className="font-bold text-lg flex items-center justify-between">
                                    {t(lang, 'modePyramid')}
                                    <Info size={16} />
                                </div>
                                <div className="text-xs opacity-70">1 → Máx → 1</div>

                                <div className="absolute bottom-full mb-2 left-0 w-64 bg-black border border-white p-2 rounded hidden group-hover:block z-50 text-xs text-white">
                                    {t(lang, 'modePyramidDesc')}
                                </div>
                            </label>
                        </div>

                        <div className="bg-black/30 p-4 rounded border border-slate-700">
                            <label className="flex items-center gap-2 text-white cursor-pointer select-none mb-2">
                                <input 
                                    type="checkbox" 
                                    checked={isPrivate} 
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                    className="w-5 h-5 accent-balatro-gold"
                                />
                                {t(lang, 'privateRoom')}
                            </label>
                            {isPrivate && (
                                <input 
                                    type="password" 
                                    placeholder={t(lang, 'password')}
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black border border-slate-500 text-white p-2 rounded focus:border-balatro-gold outline-none"
                                />
                            )}
                        </div>

                        <div className="pt-2">
                            <button 
                                onClick={handleCreate}
                                className="w-full bg-balatro-red text-white py-4 rounded text-2xl font-bold border-b-4 border-red-900 hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all"
                            >
                                {t(lang, 'createRoom')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
