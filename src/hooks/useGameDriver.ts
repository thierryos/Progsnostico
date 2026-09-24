import { useEffect } from 'react';
import { isAutomated, isTrickComplete } from '../game/engine';
import type { GameAction, GameState } from '../game/types';

/** Tempo para todos verem a última carta da vaza antes do resumo. */
export const TRICK_REVEAL_MS = 900;
const BOT_MIN_MS = 700;
const BOT_JITTER_MS = 700;

/**
 * Executa as ações "do sistema": jogadas dos bots/ausentes e a resolução da vaza.
 * Só o cliente com autoridade (offline: sempre; online: o primeiro humano conectado)
 * habilita o driver. Como o motor ignora ações repetidas, dois drivers ativos ao
 * mesmo tempo (troca de autoridade) não corrompem a partida.
 */
export const useGameDriver = (
  game: GameState | null | undefined,
  dispatch: (action: GameAction) => unknown,
  enabled: boolean,
) => {
  useEffect(() => {
    if (!enabled || !game) return;

    let action: GameAction | null = null;
    let delay = 0;

    if (isTrickComplete(game)) {
      action = { type: 'resolveTrick' };
      delay = TRICK_REVEAL_MS;
    } else if ((game.phase === 'bidding' || game.phase === 'playing') && game.currentTurn) {
      const player = game.players.find((p) => p.id === game.currentTurn);
      if (player && isAutomated(player)) {
        action = { type: 'botMove', playerId: player.id };
        delay = BOT_MIN_MS + Math.random() * BOT_JITTER_MS;
      }
    }

    if (!action) return;
    const pending = action;
    const timer = window.setTimeout(() => void dispatch(pending), delay);
    return () => window.clearTimeout(timer);
  }, [game, dispatch, enabled]);
};
