
import React, { useState, useMemo, useEffect } from 'react';
import { Card, GameState, Language } from '../types';
import { CardComponent } from './Card';
import { isValidMove } from '../services/gameService';
import { playSound, setVolume, getVolume } from '../services/soundService';
import { Trophy, Flag, AlertCircle, Volume2, VolumeX, History, LogOut, Clock, HelpCircle, Check, X } from 'lucide-react';
import { t } from '../services/i18n';
import { HelpModal } from './HelpModal';
import { CardHierarchy } from './CardHierarchy';

interface GameAreaProps {
  gameState: GameState;
  lang: Language;
  tutorialHighlight?: string;
  isTutorial?: boolean; 
  onPlayCard: (card: Card) => void;
  onBid: (amount: number) => void;
  onReadyNextTrick: () => void;
  onLeave: () => void;
  onTutorialAction?: (action: string) => void;
}

export const GameArea: React.FC<GameAreaProps> = ({ gameState, lang, tutorialHighlight, isTutorial, onPlayCard, onBid, onReadyNextTrick, onLeave, onTutorialAction }) => {
  // Garante que players é sempre um array
  const players = Array.isArray(gameState.players) ? gameState.players : [];
  const localPlayer = players.find(p => p.isLocal);
  const isSpectating = localPlayer?.hand.length === 0 && (gameState.status === 'playing' || gameState.status === 'bidding');
  const isPlayerTurn = (gameState.currentTurn === localPlayer?.id) && !isSpectating;
  const isBiddingPhase = gameState.status === 'bidding';
  const opponents = players.filter(p => !p.isLocal);

  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [volume, setVolumeState] = useState(getVolume());
  const [confirmExit, setConfirmExit] = useState(false);

  // Auto-reset confirm exit state after 3 seconds
  useEffect(() => {
    if (confirmExit) {
        const timer = setTimeout(() => setConfirmExit(false), 3000);
        return () => clearTimeout(timer);
    }
  }, [confirmExit]);

  // Generate random rotations for table cards only once per card to prevent jitter
  const cardRotations = useMemo(() => {
    const rotations: Record<string, number> = {};
    return rotations;
  }, []);

  const getCardRotation = (cardId: string) => {
      let hash = 0;
      for (let i = 0; i < cardId.length; i++) {
          hash = cardId.charCodeAt(i) + ((hash << 5) - hash);
      }
      return (hash % 10) - 5; // Range -5 to 5 degrees
  };

  const canPlayCard = (card: Card) => {
    if (!localPlayer || !isPlayerTurn || isBiddingPhase) return false;
    
    if (isTutorial) {
        if (!tutorialHighlight) return false;
        if (tutorialHighlight !== `card-${card.id}`) return false;
    }

    return isValidMove(card, localPlayer.hand, gameState.leadSuit);
  };

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '???';

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolumeState(val);
      setVolume(val);
  };

  const handleBid = (amount: number) => {
     if (isTutorial) {
         if (tutorialHighlight !== `bid-btn-${amount}`) return;
     }
     playSound('bid');
     onBid(amount);
  };

  const handleHistoryClick = () => {
      // In tutorial, clicking history just advances the step to avoid UI conflicts (masking issues)
      if (isTutorial && tutorialHighlight === 'history-btn') {
          if (onTutorialAction) onTutorialAction('click_history');
          return;
      }
      setShowHistory(true);
  };

  const handleLeaveClick = () => {
      if (confirmExit) {
          console.log('Confirmed exit. Calling onLeave...');
          onLeave();
      } else {
          console.log('Exit requested. Waiting for confirmation...');
          setConfirmExit(true);
      }
  };

  const getOpponentStyle = (index: number, totalOpponents: number) => {
    if (totalOpponents === 0) return {};
    const startAngle = 190; 
    const endAngle = 350;
    const step = totalOpponents > 1 ? (endAngle - startAngle) / (totalOpponents - 1) : 0;
    const angle = totalOpponents === 1 ? 270 : startAngle + (index * step);
    const radiusX = 42; 
    const radiusY = 38;
    const radian = (angle * Math.PI) / 180;
    return {
        left: `${50 + (radiusX * Math.cos(radian))}%`,
        top: `${50 + (radiusY * Math.sin(radian))}%`,
        transform: 'translate(-50%, -50%)'
    };
  };

  const getTableCardStyle = (playerId: string, cardId: string) => {
     // Garante que players é um array antes de usar findIndex
     const players = Array.isArray(gameState.players) ? gameState.players : [];
     const playerIndex = players.findIndex(p => p.id === playerId);
     const localIdx = players.findIndex(p => p.isLocal);
     const relativeIdx = (playerIndex - localIdx + players.length) % players.length;
     const total = players.length;
     
     const angle = 90 + (360 / total) * relativeIdx;
     const radian = (angle * Math.PI) / 180;
     
     // Increased spread
     const rX = 20; 
     const rY = 15; 
     
     const randomRot = getCardRotation(cardId);
     const visualRotation = (angle - 90) + randomRot;

     return {
        style: {
            left: `${50 + (rX * Math.cos(radian))}%`,
            top: `${45 + (rY * Math.sin(radian))}%`, 
            '--tw-rotate': `${visualRotation}deg`,
        },
        className: "animate-card-slam origin-center" 
     };
  };

  const isBidHighlighted = tutorialHighlight?.startsWith('bid-btn');
  const isCardHighlighted = tutorialHighlight?.startsWith('card-');
  const isTopBarHighlighted = ['history-btn', 'help-btn', 'hierarchy'].includes(tutorialHighlight || '');

  return (
    <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden bg-[#151515] select-none">
      
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23333333' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
      </div>

      {/* Top Bar: Hierarchy and Controls */}
      <div className={`absolute top-0 left-0 w-full flex justify-between items-start p-4 pointer-events-none ${isTopBarHighlighted ? 'z-[1002]' : 'z-[100]'}`}>
          
          {/* Card Strength Hierarchy (Always visible) */}
          <div id="hierarchy-bar" className={`pointer-events-auto transition-all duration-300 ${tutorialHighlight === 'hierarchy' ? 'ring-4 ring-balatro-gold rounded-full scale-110 shadow-[0_0_30px_rgba(234,179,8,0.8)]' : ''}`}>
             <CardHierarchy />
          </div>

          <div className="flex gap-2 pointer-events-auto">
             <button 
                id="help-btn"
                onClick={() => setShowHelp(true)}
                className={`
                    bg-slate-800 text-balatro-gold p-2 rounded-full border-2 border-slate-600 hover:bg-slate-700 hover:border-balatro-gold transition-colors shadow-lg
                    ${tutorialHighlight === 'help-btn' ? 'ring-4 ring-balatro-gold animate-pulse z-[1002] relative' : ''}
                `}
                title="Manual de Ajuda"
              >
                  <HelpCircle size={20} />
              </button>

              {gameState.trickHistory.length > 0 && (
                  <button 
                    id="history-btn"
                    onClick={handleHistoryClick}
                    className={`
                        bg-slate-800 text-slate-300 p-2 rounded-full border-2 border-slate-600 hover:text-white hover:border-white transition-colors shadow-lg
                        ${tutorialHighlight === 'history-btn' ? 'ring-4 ring-balatro-gold animate-pulse z-[1002] relative' : ''}
                    `}
                  >
                      <History size={20} />
                  </button>
              )}

              <div className="relative">
                  <button 
                    onClick={() => setShowVolume(!showVolume)}
                    className="bg-slate-800 text-balatro-gold p-2 rounded-full border-2 border-balatro-gold hover:bg-slate-700 transition-colors shadow-lg"
                  >
                    {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  
                  {showVolume && (
                      <div className="absolute top-12 right-0 bg-slate-900 border-2 border-slate-600 p-3 rounded-xl shadow-xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 w-40 z-50">
                          <input 
                            type="range" 
                            min="0" max="1" step="0.05" 
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-full accent-balatro-gold h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                      </div>
                  )}
              </div>
              
               <button 
                onClick={handleLeaveClick}
                className={`
                    p-2 rounded-full border-2 shadow-lg z-[1002] transition-all duration-200 flex items-center gap-1
                    ${confirmExit ? 'bg-red-600 border-red-400 text-white w-auto px-4' : 'bg-red-900/80 border-red-700 text-white hover:bg-red-700'}
                `}
              >
                  {confirmExit ? (
                      <><span className="text-sm font-bold animate-pulse">CONFIRMA?</span> <Check size={16} /></>
                  ) : (
                      <LogOut size={20} />
                  )}
              </button>
          </div>
      </div>

      {/* Main Game Table */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[75%] z-0 rounded-[250px] shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 rounded-[250px] bg-gradient-to-b from-[#5c3a21] to-[#2a1a0e] border-[4px] border-[#1a1008] shadow-inner"></div>
          
          <div className="absolute inset-[20px] rounded-[230px] bg-[#1a4731] overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] border-[2px] border-[#0f2b1d]">
              <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/felt.png")` }}></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0.3)_100%)]"></div>
              <div className="absolute inset-[30px] border-[2px] border-dashed border-white/20 rounded-[200px]"></div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/10 font-pixel text-6xl lg:text-8xl font-bold select-none pointer-events-none whitespace-nowrap blur-sm">
                  {t(lang, 'gameTitle')}
              </div>
          </div>
      </div>

      {/* Trump Card Area */}
      <div id="trump-area" className={`absolute top-24 left-6 z-40 flex flex-col items-center pointer-events-none transition-all duration-300 ${tutorialHighlight === 'trump-area' ? 'scale-125 z-[1000] relative' : ''}`}>
          <div className="text-balatro-gold text-xs uppercase font-bold bg-black/60 px-2 py-1 rounded mb-1 border border-balatro-gold/50">{t(lang, 'trumps')}</div>
          <div className={`pointer-events-auto transition-transform shadow-2xl ${tutorialHighlight === 'trump-area' ? 'ring-4 ring-balatro-gold rounded-lg' : ''}`}>
              {gameState.trumpCard ? (
                  <div className="scale-75 origin-top-left">
                     <CardComponent card={gameState.trumpCard} />
                  </div>
              ) : (
                  <div className="w-16 h-24 border-2 border-dashed border-white/20 rounded bg-white/5 flex items-center justify-center text-white/20 font-bold text-xs uppercase">
                      {t(lang, 'noTrump')}
                  </div>
              )}
          </div>
          {gameState.leadSuit && (
              <div className="mt-4 bg-slate-900/80 px-4 py-2 rounded border-l-4 border-balatro-blue text-white backdrop-blur-sm shadow-lg animate-in slide-in-from-left">
                 <div className="text-[10px] text-slate-400 uppercase">{t(lang, 'suitLead')}</div>
                 <div className={`font-pixel text-xl uppercase font-bold ${gameState.leadSuit === 'hearts' || gameState.leadSuit === 'diamonds' ? 'text-red-500' : 'text-white'}`}>
                    {gameState.leadSuit === 'hearts' ? 'Copas' : gameState.leadSuit === 'diamonds' ? 'Ouros' : gameState.leadSuit === 'spades' ? 'Espadas' : 'Paus'}
                 </div>
              </div>
          )}
      </div>

      {/* Opponents */}
      {opponents.map((opp, index) => {
          const isTurn = gameState.currentTurn === opp.id;
          const posStyle = getOpponentStyle(index, opponents.length);

          return (
             <div key={opp.id} className="absolute z-20" style={posStyle}>
                 <div className={`
                    relative flex flex-col items-center
                    ${isTurn ? 'scale-110' : 'scale-100'}
                    transition-transform duration-300
                 `}>
                    {isTurn && <div className="absolute -inset-4 border-4 border-balatro-gold rounded-full animate-pulse opacity-50"></div>}
                    
                    <div className={`
                        w-14 h-14 lg:w-16 lg:h-16 rounded-full border-4 flex items-center justify-center bg-slate-800 shadow-xl relative z-10
                        ${isTurn ? 'border-balatro-gold' : 'border-slate-600'}
                    `}>
                        <span className="text-2xl">👤</span>
                        {gameState.currentTrickLeader === opp.id && (
                            <div className="absolute -top-2 -right-2 bg-balatro-red text-white p-1 rounded-full text-xs border border-white z-20 shadow-sm">
                                <Flag size={12} fill="currentColor" />
                            </div>
                        )}
                        {gameState.status === 'trick_summary' && opp.isReady && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-black p-1 rounded-full border border-white z-20">
                                <AlertCircle size={10} fill="currentColor" />
                            </div>
                        )}
                    </div>

                    <div className="mt-[-10px] bg-black/80 text-white text-xs lg:text-sm px-4 py-1 rounded-full border border-slate-600 z-20 whitespace-nowrap font-bold">
                        {opp.name}
                    </div>

                    <div className="mt-2 flex gap-2 scale-100 shadow-lg">
                         <div className="bg-slate-900/90 text-white text-xs px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                             <span className="text-slate-400 text-[10px] uppercase">{t(lang, 'bid')}</span> 
                             <span className="font-bold">{opp.currentBid ?? '-'}</span>
                         </div>
                         <div className={`bg-slate-900/90 text-xs px-2 py-1 rounded border border-slate-700 flex items-center gap-1 font-bold
                             ${opp.tricksWon === opp.currentBid ? 'text-green-400' : 'text-white'}
                         `}>
                             <span className="text-slate-400 text-[10px] uppercase font-normal">{t(lang, 'won')}</span> {opp.tricksWon}
                         </div>
                    </div>

                    <div className="absolute top-10 -z-10 flex justify-center w-20">
                         {Array.from({ length: Math.min(opp.hand.length, 5) }).map((_, i) => (
                             <div key={i} className="absolute origin-top" style={{ transform: `rotate(${(i-2)*10}deg)` }}>
                                 <div className="w-6 h-10 bg-balatro-red border border-white rounded shadow-md"></div>
                             </div>
                         ))}
                    </div>
                 </div>
             </div>
          );
      })}

      {/* Played Cards Table Area */}
      <div id="table-area" className={`absolute inset-0 pointer-events-none z-10 transition-all ${tutorialHighlight === 'table-area' ? 'z-[1000] ring-4 ring-balatro-gold/50 rounded-[200px] bg-black/20' : ''}`}>
          {gameState.tableCards.map((played, idx) => {
              const { style, className } = getTableCardStyle(played.playerId, played.card.id);
              return (
                  <div key={`played-${played.playerId}`} className={`absolute ${className}`} style={{ ...style, transform: `translate(-50%, -50%) rotate(${style['--tw-rotate']})`, zIndex: idx }}>
                      <div className="transform scale-90 lg:scale-100 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
                          <CardComponent card={played.card} />
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-balatro-gold font-bold text-[10px] px-3 py-1 rounded-full whitespace-nowrap border border-balatro-gold/30 shadow-md">
                              {getPlayerName(played.playerId)}
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>

      {isSpectating && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60 font-pixel text-center pointer-events-auto">
               <div className="bg-black/80 backdrop-blur-md p-8 rounded-2xl border-4 border-slate-700 shadow-2xl animate-pulse">
                   <Clock size={48} className="mx-auto text-balatro-gold mb-4" />
                   <h2 className="text-white text-3xl uppercase font-bold mb-2">{t(lang, 'waiting')}</h2>
                   <p className="text-slate-300 text-lg">{t(lang, 'waitingOthers')}</p>
               </div>
           </div>
      )}

      {/* Trick Winner Screen */}
      {gameState.status === 'trick_summary' && gameState.trickResult && (
           <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 font-pixel">
               <div className="bg-[#1a1c23] border-4 border-balatro-gold p-8 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center gap-6 max-w-5xl w-[90%] pointer-events-auto">
                   
                   <div className="flex flex-col items-center gap-2">
                        <Trophy size={64} className="text-balatro-gold animate-bounce drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                        <div className="text-center">
                            <h2 className="text-slate-400 uppercase tracking-widest text-sm mb-1">{t(lang, 'trickWinner')}</h2>
                            <h1 className="text-5xl text-white font-pixel font-bold drop-shadow-md">{getPlayerName(gameState.trickResult.winnerId)}</h1>
                        </div>
                   </div>
                   
                   <div className="flex flex-wrap justify-center gap-8 lg:gap-12 bg-black/30 p-6 rounded-xl w-full border border-slate-700 min-h-[220px] items-center">
                        {gameState.tableCards.map((played, idx) => {
                            const isWinner = played.playerId === gameState.trickResult!.winnerId;
                            return (
                                <div key={idx} className={`flex flex-col items-center gap-2 transition-transform duration-500 ${isWinner ? 'scale-125 -translate-y-4 z-10' : 'scale-100 opacity-90'}`}>
                                    <div className={`relative ${isWinner ? 'ring-4 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)] rounded-xl' : ''}`}>
                                        <CardComponent card={played.card} small={!isWinner} />
                                        {isWinner && (
                                            <div className="absolute -top-3 -right-3 bg-green-500 text-black p-1 rounded-full shadow-lg border border-white">
                                                <Trophy size={16} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-xs uppercase font-bold ${isWinner ? 'text-green-400' : 'text-slate-500'}`}>
                                            {getPlayerName(played.playerId)}
                                        </div>
                                        {isWinner && <div className="text-[10px] text-balatro-gold uppercase mt-1">{t(lang, 'winnerCard')}</div>}
                                    </div>
                                </div>
                            )
                        })}
                   </div>

                   <div className="w-full h-px bg-slate-700 my-2"></div>

                   <button 
                      onClick={onReadyNextTrick}
                      disabled={localPlayer?.isReady}
                      className={`
                          w-full md:w-1/2 py-4 rounded-xl text-xl font-bold uppercase tracking-widest transition-all border-b-4 active:translate-y-1 active:border-b-0
                          ${localPlayer?.isReady 
                              ? 'bg-slate-700 text-slate-400 border-slate-800 cursor-not-allowed' 
                              : 'bg-green-600 text-white border-green-800 hover:brightness-110 shadow-lg'}
                      `}
                   >
                       {localPlayer?.isReady ? t(lang, 'waiting') : t(lang, 'readyNext')}
                   </button>
                   <p className="text-slate-500 text-xs uppercase tracking-wider">{t(lang, 'discuss')}</p>
               </div>
           </div>
      )}

      {/* History Modal */}
      {showHistory && (
          <div className="absolute inset-0 z-[150] bg-black/90 backdrop-blur flex items-center justify-center p-4 font-pixel" onClick={() => setShowHistory(false)}>
              <div className="bg-slate-900 border-4 border-slate-600 w-full max-w-6xl max-h-[85vh] overflow-y-auto rounded-3xl p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <h2 className="text-4xl text-white font-pixel mb-6 border-b-2 border-slate-700 pb-4 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                      <span>{t(lang, 'roundResults')}</span>
                      <button onClick={() => setShowHistory(false)} className="hover:text-red-500 transition-colors"><VolumeX className="rotate-45" size={32} /></button>
                  </h2>
                  <div className="space-y-6">
                      {gameState.trickHistory.slice().reverse().map((trick, i) => (
                          <div key={i} className="bg-slate-800 p-6 rounded-2xl border-2 border-slate-700 flex flex-col md:flex-row items-center gap-6">
                              <div className="flex flex-col items-center md:items-start min-w-[150px]">
                                  <span className="text-slate-400 uppercase tracking-widest text-sm">Duelo #{trick.trickNumber}</span>
                                  <span className="text-balatro-gold text-2xl font-bold mt-1">{getPlayerName(trick.winnerId)}</span>
                                  {trick.leadSuit && <span className="text-slate-500 text-xs mt-1">{trick.leadSuit}</span>}
                              </div>
                              
                              <div className="flex-1 flex flex-wrap gap-4 justify-center md:justify-start bg-black/20 p-4 rounded-xl">
                                  {trick.cards.map((pc, idx) => {
                                      const isWinner = pc.playerId === trick.winnerId;
                                      return (
                                          <div key={idx} className="flex flex-col items-center gap-1">
                                              <div className={isWinner ? 'ring-2 ring-balatro-gold rounded-lg' : ''}>
                                                  <CardComponent card={pc.card} small />
                                              </div>
                                              <span className={`text-[10px] uppercase font-bold ${isWinner ? 'text-balatro-gold' : 'text-slate-500'}`}>
                                                  {getPlayerName(pc.playerId)}
                                              </span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                      {gameState.trickHistory.length === 0 && <p className="text-slate-500 text-center py-12 text-2xl">{t(lang, 'empty')}</p>}
                  </div>
              </div>
          </div>
      )}

      {/* Help Modal */}
      {showHelp && (
          <HelpModal lang={lang} onClose={() => setShowHelp(false)} />
      )}

      {/* Local Hand */}
      <div id="local-hand" className={`
        absolute bottom-0 left-0 right-0 h-[35%] z-50 flex flex-col items-center justify-end pb-6
        transition-opacity duration-300
        ${(!isPlayerTurn && !isBiddingPhase && gameState.status !== 'trick_summary') ? 'opacity-90' : 'opacity-100'}
        ${tutorialHighlight === 'local-hand' ? 'z-[1000] brightness-125' : ''}
        ${isCardHighlighted ? 'z-[1001]' : ''} 
      `}>
          
          {isPlayerTurn && !isBiddingPhase && (
             <div className="absolute -top-10 animate-bounce bg-balatro-gold text-black px-8 py-3 rounded-full font-bold font-pixel text-xl border-4 border-white shadow-lg pointer-events-none z-50">
                 {t(lang, 'yourTurn')}
             </div>
          )}

          {gameState.currentTrickLeader === localPlayer?.id && !isSpectating && (
             <div className="absolute -top-24 right-10 bg-balatro-red text-white px-4 py-2 rounded-full font-bold uppercase border-2 border-white shadow-lg flex items-center gap-2 pointer-events-none z-50 animate-pulse">
                 <Flag size={18} /> {t(lang, 'youStart')}
             </div>
          )}

          <div className="flex justify-center items-end h-full w-full px-4 overflow-visible perspective-1000">
             <div className="flex -space-x-12 lg:-space-x-16 hover:space-x-2 transition-all duration-300 mb-4">
                {localPlayer?.hand.map((card, index) => {
                    const valid = canPlayCard(card);
                    const center = (localPlayer.hand.length - 1) / 2;
                    const rotate = (index - center) * 4;
                    const translateY = Math.abs(index - center) * 6;
                    
                    const isTutorialTarget = tutorialHighlight === `card-${card.id}`;

                    return (
                        <div 
                            key={card.id}
                            id={`card-${card.id}`}
                            className={`
                                relative transition-all duration-300 ease-out animate-deal
                                ${valid 
                                    ? 'hover:-translate-y-16 hover:scale-110 cursor-pointer hover:z-50 hover:rotate-0' 
                                    : isBiddingPhase 
                                        ? 'cursor-default hover:-translate-y-4' 
                                        : 'grayscale brightness-50 cursor-not-allowed translate-y-8'
                                }
                                ${isTutorialTarget ? 'z-[1001] ring-4 ring-balatro-gold rounded-xl shadow-[0_0_50px_rgba(234,179,8,0.8)]' : ''}
                            `}
                            style={{ 
                                transform: `rotate(${rotate}deg) translateY(${translateY}px)`,
                                zIndex: isTutorialTarget ? 1001 : index,
                                animationDelay: `${index * 50}ms`,
                            }}
                        >
                            <CardComponent card={card} onClick={() => valid ? onPlayCard(card) : null} />
                        </div>
                    );
                })}
             </div>
          </div>

          <div className="absolute bottom-6 right-6 bg-slate-900/95 border-2 border-slate-700 rounded-2xl p-4 flex gap-6 text-white font-pixel shadow-2xl pointer-events-none">
               <div className="text-center">
                   <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t(lang, 'bid')}</div>
                   <div className="text-3xl leading-none text-balatro-blue font-bold">{localPlayer?.currentBid ?? '-'}</div>
               </div>
               <div className="w-px bg-slate-700"></div>
               <div className="text-center">
                   <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{t(lang, 'won')}</div>
                   <div className={`text-3xl leading-none font-bold ${localPlayer?.tricksWon === localPlayer?.currentBid ? 'text-green-400' : 'text-white'}`}>
                       {localPlayer?.tricksWon}
                   </div>
               </div>
          </div>
      </div>

      {isBiddingPhase && isPlayerTurn && (
          <div className={`
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg
              ${isBidHighlighted ? 'z-[1001]' : 'z-[100]'}
          `}>
             <div className="bg-slate-900/95 border-4 border-balatro-gold p-8 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center backdrop-blur-sm animate-in zoom-in-95 duration-200">
                <h2 className="text-balatro-gold text-5xl mb-2 font-pixel drop-shadow-md">{t(lang, 'bid')}</h2>
                <p className="text-slate-300 mb-8 text-center text-lg">{t(lang, 'bidPrompt')}</p>
                <div className="flex flex-wrap justify-center gap-4">
                    {Array.from({ length: localPlayer?.hand.length! + 1 }).map((_, i) => (
                        <button
                        key={i}
                        id={`bid-btn-${i}`}
                        onMouseEnter={() => playSound('hover')}
                        onClick={() => handleBid(i)}
                        disabled={isTutorial && tutorialHighlight !== `bid-btn-${i}`}
                        className={`
                            w-16 h-16 bg-slate-800 border-2 border-slate-600 text-white text-3xl font-bold rounded-2xl 
                            hover:bg-balatro-blue hover:border-white hover:scale-110 transition-all shadow-lg active:translate-y-1 font-pixel
                            ${tutorialHighlight === `bid-btn-${i}` ? 'ring-4 ring-balatro-gold shadow-[0_0_30px_rgba(234,179,8,0.8)] z-[1001] relative' : 'z-50'}
                            ${isTutorial && tutorialHighlight !== `bid-btn-${i}` ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:bg-slate-800' : ''}
                        `}
                        >
                        {i}
                        </button>
                    ))}
                </div>
             </div>
          </div>
      )}

    </div>
  );
};
