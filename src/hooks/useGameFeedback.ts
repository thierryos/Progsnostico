import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { playSound, vibrate } from '../lib/sound';

/**
 * Sons e vibração derivados das mudanças de estado. Funciona igual para todos os
 * clientes (não depende de quem fez a ação).
 */
export const useGameFeedback = (game: GameState, localId: string, enabled = true) => {
  const prev = useRef<GameState | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = game;
    if (!enabled || !before) return;

    if (game.tableCards.length > before.tableCards.length) playSound('flip');
    if (game.phase !== before.phase) {
      if (game.phase === 'trick_summary') playSound('win_trick');
      if (game.phase === 'round_end' || game.phase === 'game_over') playSound('round_end');
    }
    const myTurnNow = game.currentTurn === localId;
    if (myTurnNow && before.currentTurn !== localId) {
      playSound('your_turn');
      vibrate(40);
    }
  }, [game, localId, enabled]);
};
