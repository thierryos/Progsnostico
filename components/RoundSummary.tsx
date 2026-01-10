
import React, { useEffect } from 'react';
import { RoundResult, Player } from '../types';
import { ArrowRight, Check, X } from 'lucide-react';
import { playSound } from '../services/soundService';

interface RoundSummaryProps {
  results: RoundResult[];
  players: Player[];
  round: number;
  totalRounds: number;
  onToggleReady: () => void;
  onLeave: () => void;
  localPlayerId: string;
  isGameOver?: boolean;
}

export const RoundSummary: React.FC<RoundSummaryProps> = ({ results, players, round, totalRounds, onToggleReady, onLeave, localPlayerId, isGameOver = false }) => {
  
  useEffect(() => {
    playSound('round_end');
  }, []);

  // Map readiness from live players array to results
  const hydratedResults = results.map(r => {
      const livePlayer = players.find(p => p.id === r.playerId);
      return {
          ...r,
          isReady: livePlayer ? livePlayer.isReady : r.isReady
      };
  });

  const localResult = hydratedResults.find(r => r.playerId === localPlayerId);
  const readyCount = hydratedResults.filter(r => r.isReady).length;
  const totalPlayers = hydratedResults.length;

  const displayResults = isGameOver 
      ? [...hydratedResults].sort((a,b) => b.totalScore - a.totalScore) 
      : hydratedResults;

  const handleAction = () => {
      playSound('bid');
      if (isGameOver) {
          onLeave();
      } else {
          onToggleReady();
      }
  };

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-500 font-pixel">
      <div className="bg-slate-900 border-4 border-balatro-gold p-6 lg:p-8 rounded-3xl shadow-2xl max-w-5xl w-[95%] h-[90%] flex flex-col items-center">
        
        <div className="flex flex-col items-center mb-6">
            {!isGameOver && <h2 className="text-balatro-gold text-2xl uppercase tracking-widest font-bold mb-1">Rodada {round} / {totalRounds}</h2>}
            <h1 className="text-white text-5xl lg:text-7xl font-pixel drop-shadow-[4px_4px_0_#000]">
                {isGameOver ? 'FIM DE JOGO' : 'PLACAR'}
            </h1>
        </div>

        <div className="flex-1 w-full bg-slate-800 rounded-xl border-2 border-slate-600 overflow-y-auto mb-6 custom-scrollbar">
            <table className="w-full text-center relative">
                <thead className="bg-slate-950 text-slate-400 uppercase text-sm font-bold tracking-wider sticky top-0 z-10 shadow-md">
                    <tr>
                        {isGameOver && <th className="py-4 px-2">#</th>}
                        <th className="py-4 px-2">Jogador</th>
                        <th className="py-4 px-2">Palpite / Feitas</th>
                        <th className="py-4 px-2">Pts Rodada</th>
                        <th className="py-4 px-2">Total</th>
                        <th className="py-4 px-2">Status</th>
                    </tr>
                </thead>
                <tbody className="text-white text-xl lg:text-2xl divide-y divide-slate-700">
                    {displayResults.map((r, idx) => {
                        const hitBid = r.bid === r.won;
                        return (
                            <tr key={r.playerId} className={`
                                ${r.isLocal ? 'bg-white/5' : ''} 
                                hover:bg-white/10 transition-colors
                            `}>
                                {isGameOver && (
                                    <td className="py-4 px-2 text-balatro-gold font-bold">
                                        {idx === 0 ? '👑' : idx + 1}
                                    </td>
                                )}
                                <td className="py-4 px-2 flex items-center justify-center gap-2">
                                    {r.isLocal && <span className="text-balatro-gold">➤</span>}
                                    {r.playerName}
                                </td>
                                <td className="py-4 px-2 text-slate-300">
                                    <span className="text-slate-500">{r.bid}</span> / <span className={hitBid ? 'text-green-400' : 'text-red-400'}>{r.won}</span>
                                </td>
                                <td className="py-4 px-2">
                                    <div className="flex flex-col items-center">
                                        <span className={`font-bold text-sm ${hitBid ? 'text-green-400' : 'text-red-400'}`}>
                                            {hitBid ? 'ACERTOU' : 'ERROU'}
                                        </span>
                                        <span className="text-balatro-gold">+{r.scoreDelta}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-2 font-bold text-3xl text-balatro-blue">{r.totalScore}</td>
                                <td className="py-4 px-2">
                                    {r.isReady ? (
                                        <span className="text-green-500 flex justify-center"><Check /></span>
                                    ) : (
                                        <span className="text-slate-600 text-sm">...</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>

        <div className="w-full flex flex-col items-center gap-2">
            {!isGameOver && (
                <div className="text-slate-400 uppercase tracking-widest text-sm mb-2">
                    Aguardando jogadores: {readyCount} / {totalPlayers}
                </div>
            )}
            
            <button 
                onClick={handleAction}
                className={`
                    group relative px-12 py-4 text-white font-pixel text-3xl uppercase rounded-xl border-b-8 transition-all flex items-center gap-4
                    ${isGameOver 
                        ? 'bg-slate-700 border-slate-900 hover:bg-slate-600'
                        : localResult?.isReady 
                            ? 'bg-green-600 border-green-800 hover:brightness-110' 
                            : 'bg-balatro-red border-red-900 hover:brightness-110 active:border-b-0 active:translate-y-2'}
                `}
            >
                {isGameOver 
                    ? 'VOLTAR AO LOBBY' 
                    : localResult?.isReady ? 'AGUARDANDO...' : 'PRONTO PARA PRÓXIMA'} 
                
                {!localResult?.isReady && !isGameOver && <ArrowRight className="group-hover:translate-x-2 transition-transform" size={32} />}
                {isGameOver && <X className="group-hover:rotate-90 transition-transform" size={32} />}
            </button>
        </div>

      </div>
    </div>
  );
};
