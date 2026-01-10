
import React, { useState } from 'react';
import { RoomConfig } from '../types';
import { Bot, User, Play, Copy, ArrowLeft, Check, Trash2, Settings, Plus } from 'lucide-react';
import { playSound } from '../services/soundService';
import { calculateRoundSequence } from '../constants';
import { t } from '../services/i18n';

interface WaitingRoomProps {
  room: RoomConfig;
  localPlayerId: string;
  onLeave: () => void;
  onStartGame: () => void;
  onAddBot: () => void;
  onKickPlayer: (playerId: string) => void;
  onToggleReady: () => void;
  onUpdateSettings: (settings: Partial<RoomConfig>) => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ 
  room, 
  localPlayerId, 
  onLeave, 
  onStartGame, 
  onAddBot,
  onKickPlayer,
  onToggleReady,
  onUpdateSettings
}) => {
  // Garante que players é um array
  const players = Array.isArray(room.players) ? room.players : [];
  const isHost = players.find(p => p.id === localPlayerId)?.isHost;
  const localPlayer = players.find(p => p.id === localPlayerId);
  const [copied, setCopied] = useState(false);

  const sequence = calculateRoundSequence(players.length || 2, room.gameMode, room.maxHandSize);
  const totalRounds = sequence.length;

  const copyInvite = () => {
    navigator.clipboard.writeText(`Entrar na sala: ${room.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    playSound('flip');
  };

  const allReady = players.every(p => p.isReady);

  // Helper for max cards change
  const currentAbsoluteMax = Math.floor(52 / players.length);

  // Ensure current setting doesn't exceed absolute max automatically
  const safeMaxHandSize = room.maxHandSize && room.maxHandSize > 0 
      ? Math.min(room.maxHandSize, currentAbsoluteMax) 
      : 0;

  const handleMaxPlayersChange = (newMax: number) => {
      const absoluteMaxForNewPlayers = Math.floor(52 / newMax);
      const newSettings: Partial<RoomConfig> = { maxPlayers: newMax };
      
      if (safeMaxHandSize > absoluteMaxForNewPlayers && safeMaxHandSize !== 0) {
          newSettings.maxHandSize = absoluteMaxForNewPlayers;
      }
      onUpdateSettings(newSettings);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center font-pixel bg-[#111] overflow-hidden p-0 lg:p-4">
      <div className="w-full h-full max-w-7xl lg:bg-slate-900 lg:border-4 lg:border-balatro-gold lg:rounded-3xl lg:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Config & Info (Sticky/Fixed on Desktop, Scrollable on Mobile) */}
        <div className="w-full lg:w-96 flex flex-col gap-4 bg-slate-900 p-4 border-b-4 border-balatro-gold lg:border-b-0 lg:border-r-4 shrink-0 lg:h-full overflow-y-auto max-h-[40vh] lg:max-h-full">
            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-slate-900 z-10 py-2">
                 <button onClick={() => { playSound('bid'); onLeave(); }} className="bg-slate-800 text-slate-300 p-2 rounded hover:bg-red-900 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl lg:text-3xl text-white truncate">{room.name}</h1>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
                <div className="flex items-center gap-2 text-balatro-gold uppercase tracking-widest font-bold border-b border-slate-700 pb-2">
                    <Settings size={16} /> Configurações
                </div>

                <div>
                    <label className="text-slate-400 text-sm uppercase">Modo de Jogo</label>
                    {isHost ? (
                        <div className="flex bg-slate-900 rounded p-1 mt-1">
                            <button 
                                onClick={() => { playSound('bid'); onUpdateSettings({ gameMode: 'up' }) }}
                                className={`flex-1 py-2 rounded text-sm ${room.gameMode === 'up' ? 'bg-balatro-blue text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Sobe
                            </button>
                            <button 
                                onClick={() => { playSound('bid'); onUpdateSettings({ gameMode: 'up_down' }) }}
                                className={`flex-1 py-2 rounded text-sm ${room.gameMode === 'up_down' ? 'bg-balatro-blue text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Sobe & Desce
                            </button>
                        </div>
                    ) : (
                        <div className="text-white text-lg mt-1">
                            {room.gameMode === 'up' ? 'Clássico (Sobe)' : 'Pirâmide (Sobe/Desce)'}
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-slate-400 text-sm uppercase flex justify-between">
                        <span>Máx Jogadores</span>
                        <span className="text-white">{room.maxPlayers}</span>
                    </label>
                    {isHost ? (
                        <input 
                            type="range" 
                            min={Math.max(2, players.length)} 
                            max="7"
                            value={room.maxPlayers}
                            onChange={(e) => handleMaxPlayersChange(parseInt(e.target.value))}
                            className="w-full accent-balatro-blue h-4 bg-slate-900 rounded-lg appearance-none cursor-pointer mt-1"
                        />
                    ) : (
                        <div className="text-white text-lg mt-1">{room.maxPlayers}</div>
                    )}
                </div>

                <div>
                    <label className="text-slate-400 text-sm uppercase flex justify-between">
                        <span>{t('pt', 'cardsPerHand')}</span>
                        <span className="text-balatro-gold">{safeMaxHandSize > 0 ? safeMaxHandSize : `Máx (${currentAbsoluteMax})`}</span>
                    </label>
                    {isHost ? (
                        <div className="flex gap-2 items-center mt-1">
                             <input 
                                type="range" 
                                min="0" max={currentAbsoluteMax} 
                                value={safeMaxHandSize}
                                onChange={(e) => onUpdateSettings({ maxHandSize: parseInt(e.target.value) })}
                                className="w-full accent-balatro-gold h-4 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    ) : (
                         <div className="text-white text-lg mt-1">
                            {safeMaxHandSize > 0 ? `${safeMaxHandSize} Cartas` : 'Máximo do Baralho'}
                         </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-2">
                    <div>
                        <div className="text-slate-400 text-sm uppercase">Jogadores</div>
                        <div className="text-white text-xl">{players.length} / {room.maxPlayers}</div>
                    </div>
                    <div>
                         <div className="text-slate-400 text-sm uppercase">Total Rodadas</div>
                         <div className="text-white text-xl">{totalRounds}</div>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block mt-auto">
                <button onClick={copyInvite} className="w-full bg-slate-800 text-white p-4 rounded hover:bg-slate-700 flex items-center justify-center gap-2 uppercase font-bold border-2 border-slate-600 transition-colors">
                    {copied ? 'COPIADO!' : <><Copy size={16} /> Copiar ID da Sala</>}
                </button>
            </div>
        </div>

        {/* Right Panel: Players */}
        <div className="flex-1 flex flex-col bg-slate-900/50 overflow-hidden relative">
            <div className="p-4 lg:p-8 flex justify-between items-center bg-slate-900 lg:bg-transparent shadow-md lg:shadow-none z-10 shrink-0">
                <h2 className="text-slate-400 uppercase tracking-widest flex items-center gap-4">
                    <span>Jogadores</span>
                    <span className={`text-sm font-bold ${allReady ? 'text-green-500' : 'text-yellow-500'}`}>
                        {players.filter(p => p.isReady).length} / {players.length} Prontos
                    </span>
                </h2>
                
                {isHost && players.length < room.maxPlayers && (
                    <button 
                        onClick={() => { playSound('bid'); onAddBot(); }}
                        className="bg-slate-700 text-white px-4 py-2 rounded text-sm hover:bg-balatro-gold hover:text-black transition-colors flex items-center gap-2 font-bold uppercase shadow-lg border border-slate-500"
                    >
                        <Plus size={16} /> Add Bot
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20 lg:pb-0">
                    {players.map(p => (
                        <div key={p.id} className={`
                            aspect-[3/4] border-4 rounded-xl flex flex-col items-center justify-center relative animate-in zoom-in duration-300 group shadow-lg
                            ${p.isReady ? 'border-green-600 bg-green-900/20' : 'border-slate-600 bg-slate-800'}
                        `}>
                            {p.isHost && <div className="absolute top-2 right-2 text-balatro-gold text-[10px] font-bold border border-balatro-gold px-1 rounded bg-black/50">HOST</div>}
                            
                            {isHost && !p.isLocal && (
                                <button 
                                    onClick={() => onKickPlayer(p.id)}
                                    className="absolute top-2 left-2 bg-red-600 text-white p-1 rounded hover:bg-red-500 hover:scale-110 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 shadow-lg z-10"
                                    title="Expulsar Jogador"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                            
                            <div className={`
                                w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mb-3 text-2xl lg:text-3xl border-2 
                                ${p.isReady ? 'bg-green-700 border-green-400' : 'bg-slate-700 border-slate-500'}
                            `}>
                                {p.id.startsWith('bot') ? <Bot /> : <User />}
                            </div>
                            
                            <div className="text-base lg:text-lg text-white font-bold truncate max-w-full px-2">{p.name}</div>
                            
                            <div className={`text-[10px] lg:text-xs uppercase mt-2 font-bold flex items-center gap-1 ${p.isReady ? 'text-green-400' : 'text-slate-500'}`}>
                                {p.isReady ? <><Check size={12} /> Pronto</> : 'Aguardando'}
                            </div>
                        </div>
                    ))}

                    {Array.from({ length: Math.max(0, room.maxPlayers - players.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-[3/4] border-4 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center opacity-30">
                            <div className="text-slate-500 text-sm mb-2 uppercase font-bold">Vazio</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-slate-900 border-t-2 border-slate-700 flex flex-col sm:flex-row justify-end gap-4 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-20">
                <button onClick={copyInvite} className="lg:hidden w-full bg-slate-700 text-white p-3 rounded hover:bg-slate-600 flex items-center justify-center gap-2 uppercase font-bold text-sm">
                    {copied ? 'COPIADO!' : <><Copy size={16} /> ID</>}
                </button>

                <button 
                   onClick={() => { playSound('bid'); onToggleReady(); }}
                   className={`
                       w-full sm:w-auto px-8 py-3 rounded-xl text-lg lg:text-2xl font-bold uppercase transition-all border-b-4 active:border-b-0 active:translate-y-1
                       ${localPlayer?.isReady 
                           ? 'bg-yellow-600 text-black border-yellow-800 hover:brightness-110' 
                           : 'bg-green-600 text-white border-green-800 hover:brightness-110'}
                   `}
                >
                   {localPlayer?.isReady ? 'Não Estou Pronto' : 'Estou Pronto'}
                </button>

                {isHost && (
                    <button 
                        onClick={() => { playSound('round_end'); onStartGame(); }}
                        disabled={!allReady || players.length < 2}
                        className="w-full sm:w-auto bg-balatro-red text-white text-lg lg:text-2xl py-3 px-12 rounded-xl border-b-8 border-red-900 hover:brightness-110 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase font-bold"
                    >
                        <Play fill="currentColor" /> Iniciar
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
