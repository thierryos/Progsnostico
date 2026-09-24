import { describe, expect, it } from 'vitest';
import { reduce } from '../game/engine';
import type { GameAction } from '../game/types';
import {
  TUTORIAL_BOT,
  TUTORIAL_ME,
  TUTORIAL_STEPS,
  createTutorialGame,
  matchesWait,
} from './script';

describe('roteiro do tutorial', () => {
  it('segue o motor real até o placar de 7 x 6', () => {
    let game = createTutorialGame('Você', 'Bot');
    const apply = (action: GameAction) => {
      const next = reduce(game, action);
      expect(next, JSON.stringify(action)).not.toBe(game);
      game = next;
    };

    for (const step of TUTORIAL_STEPS) {
      if (step.wait?.type === 'bid')
        apply({ type: 'bid', playerId: TUTORIAL_ME, amount: step.wait.amount });
      if (step.wait?.type === 'play')
        apply({ type: 'play', playerId: TUTORIAL_ME, cardId: step.wait.cardId });
      if (step.botReply) apply({ type: 'play', playerId: TUTORIAL_BOT, cardId: step.botReply });
      step.onNext?.forEach(apply);
    }

    expect(game.phase).toBe('round_end');
    const score = (id: string) => game.players.find((p) => p.id === id)?.score;
    expect(score(TUTORIAL_ME)).toBe(7);
    expect(score(TUTORIAL_BOT)).toBe(6);
  });

  it('só aceita a ação pedida no passo', () => {
    const step = TUTORIAL_STEPS.find((s) => s.wait?.type === 'bid')!;
    expect(matchesWait(step.wait, { type: 'bid', playerId: TUTORIAL_ME, amount: 2 })).toBe(true);
    expect(matchesWait(step.wait, { type: 'bid', playerId: TUTORIAL_ME, amount: 1 })).toBe(false);
  });
});
