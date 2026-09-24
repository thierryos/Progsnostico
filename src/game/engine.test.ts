import { describe, expect, it } from 'vitest';
import { chooseCard } from './bot';
import { createCard, createDeck, roundSequence, sortHand } from './cards';
import {
  createGame,
  getHostId,
  isAutomated,
  isTrickComplete,
  reduce,
  type EngineContext,
} from './engine';
import { isValidMove, scoreRound, winningPlay } from './rules';
import { GameRuleError, type GameState } from './types';

/** RNG determinístico para testes reproduzíveis. */
const seeded = (seed: number): EngineContext => {
  let s = seed >>> 0;
  return {
    random: () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
};

const lobbyWithBots = (bots: number, settings: Parameters<typeof createGame>[0] = {}) => {
  let state = createGame({ maxPlayers: 7, ...settings }, { id: 'me', name: 'Eu' });
  for (let i = 0; i < bots; i++) state = reduce(state, { type: 'addBot', by: 'me' });
  return state;
};

/** Faz a jogada da vez usando a estratégia do bot, mesmo que seja um humano. */
const playAsBot = (state: GameState, ctx?: EngineContext): GameState => {
  const id = state.currentTurn;
  const human = state.players.find((p) => p.id === id && !isAutomated(p));
  const asBot = human
    ? { ...state, players: state.players.map((p) => (p.id === id ? { ...p, isAway: true } : p)) }
    : state;
  const next = reduce(asBot, { type: 'botMove', playerId: id }, ctx);
  if (!human) return next;
  return { ...next, players: next.players.map((p) => (p.id === id ? { ...p, isAway: false } : p)) };
};

/** Joga automaticamente (como o "driver" faria) até a partida terminar. */
const autoPlay = (initial: GameState, ctx: EngineContext, maxSteps = 5000) => {
  let state = initial;
  for (let step = 0; step < maxSteps && state.phase !== 'game_over'; step++) {
    let next: GameState;
    if (isTrickComplete(state)) {
      next = reduce(state, { type: 'resolveTrick' }, ctx);
    } else if (state.phase === 'trick_summary' || state.phase === 'round_end') {
      const pending = state.players.find((p) => !p.isReady);
      if (!pending) throw new Error('resumo travado sem jogadores pendentes');
      next = reduce(state, { type: 'ready', playerId: pending.id }, ctx);
    } else {
      next = playAsBot(state, ctx);
    }
    if (next === state) throw new Error(`jogo travado na fase ${state.phase}`);
    state = next;
    assertInvariants(state);
  }
  return state;
};

const assertInvariants = (state: GameState) => {
  const ids = state.players.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(state.tableCards.length).toBeLessThanOrEqual(state.players.length);

  const inPlay = [
    ...state.players.flatMap((p) => p.hand),
    ...state.tableCards.map((t) => t.card),
    ...(state.trumpCard ? [state.trumpCard] : []),
  ].map((c) => c.id);
  expect(new Set(inPlay).size).toBe(inPlay.length);

  if (state.phase === 'bidding' || state.phase === 'playing') {
    expect(ids).toContain(state.currentTurn || ids[0]);
  }
};

describe('baralho e rodadas', () => {
  it('gera 52 cartas únicas', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('calcula a sequência de rodadas', () => {
    expect(roundSequence(4, 'up')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(roundSequence(7, 'up_down')).toEqual([1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]);
    expect(roundSequence(3, 'up', 3)).toEqual([1, 2, 3]);
    expect(roundSequence(2, 'up', 99)).toHaveLength(26);
  });

  it('ordena a mão por naipe, com o trunfo por último', () => {
    const hand = [createCard('A', 'clubs'), createCard('2', 'spades'), createCard('K', 'spades')];
    expect(sortHand(hand, 'spades').map((c) => c.id)).toEqual(['A-clubs', '2-spades', 'K-spades']);
  });
});

describe('regras', () => {
  const hand = [createCard('2', 'hearts'), createCard('K', 'spades')];

  it('obriga a seguir o naipe puxado', () => {
    expect(isValidMove(hand[1], hand, 'hearts')).toBe(false);
    expect(isValidMove(hand[0], hand, 'hearts')).toBe(true);
    expect(isValidMove(hand[1], hand, 'diamonds')).toBe(true);
  });

  it('decide o vencedor: trunfo > naipe puxado > descarte', () => {
    const play = (
      playerId: string,
      rank: '2' | '3' | 'A' | 'K',
      suit: 'hearts' | 'clubs' | 'spades',
    ) => ({
      playerId,
      card: createCard(rank, suit),
    });
    expect(
      winningPlay([play('a', '3', 'hearts'), play('b', 'A', 'spades')], 'clubs').playerId,
    ).toBe('a');
    expect(winningPlay([play('a', 'A', 'hearts'), play('b', '2', 'clubs')], 'clubs').playerId).toBe(
      'b',
    );
    expect(winningPlay([play('a', 'K', 'hearts'), play('b', 'A', 'hearts')], null).playerId).toBe(
      'b',
    );
  });

  it('pontua 1 por vaza e +5 pelo palpite exato', () => {
    expect(scoreRound(2, 2)).toBe(7);
    expect(scoreRound(2, 3)).toBe(3);
    expect(scoreRound(0, 0)).toBe(5);
  });

  it('bot que já cumpriu o palpite tenta perder', () => {
    const card = chooseCard({
      hand: [createCard('A', 'hearts'), createCard('3', 'hearts')],
      leadSuit: 'hearts',
      tableCards: [{ playerId: 'x', card: createCard('10', 'hearts') }],
      trumpSuit: null,
      bid: 0,
      tricksWon: 0,
    });
    expect(card.id).toBe('3-hearts');
  });
});

describe('sala de espera', () => {
  it('só o host adiciona bots, altera configurações e inicia', () => {
    let state = createGame({}, { id: 'host', name: 'Host' });
    state = reduce(state, { type: 'join', player: { id: 'guest', name: 'Convidado' } });
    expect(getHostId(state)).toBe('host');

    expect(reduce(state, { type: 'addBot', by: 'guest' })).toBe(state);
    expect(
      reduce(state, { type: 'updateSettings', by: 'guest', settings: { maxPlayers: 7 } }),
    ).toBe(state);
    expect(reduce(state, { type: 'startGame', by: 'host' })).toBe(state); // convidado não está pronto

    state = reduce(state, { type: 'toggleReady', playerId: 'guest' });
    state = reduce(state, { type: 'startGame', by: 'host' }, seeded(1));
    expect(state.phase).toBe('bidding');
    expect(state.players.every((p) => p.hand.length === 1)).toBe(true);
  });

  it('recusa entrada em sala cheia ou em andamento', () => {
    let state = createGame({ maxPlayers: 2 }, { id: 'host', name: 'Host' });
    state = reduce(state, { type: 'addBot', by: 'host' });
    expect(() => reduce(state, { type: 'join', player: { id: 'x', name: 'X' } })).toThrow(
      GameRuleError,
    );

    state = reduce(state, { type: 'startGame', by: 'host' }, seeded(2));
    expect(() => reduce(state, { type: 'join', player: { id: 'y', name: 'Y' } })).toThrow(
      /game_started/,
    );
  });

  it('transfere o host quando ele sai', () => {
    let state = createGame({}, { id: 'a', name: 'A' });
    state = reduce(state, { type: 'join', player: { id: 'b', name: 'B' } });
    state = reduce(state, { type: 'leave', playerId: 'a' });
    expect(getHostId(state)).toBe('b');
  });

  it('não deixa o maxPlayers ficar abaixo do número de jogadores', () => {
    let state = lobbyWithBots(3);
    state = reduce(state, { type: 'updateSettings', by: 'me', settings: { maxPlayers: 2 } });
    expect(state.settings.maxPlayers).toBe(4);
  });
});

describe('partida', () => {
  it('ignora ações fora de turno e cartas ilegais', () => {
    const state = reduce(
      lobbyWithBots(1, { maxHandSize: 3 }),
      { type: 'startGame', by: 'me' },
      seeded(3),
    );
    const other = state.players.find((p) => p.id !== state.currentTurn)!;
    expect(reduce(state, { type: 'bid', playerId: other.id, amount: 0 })).toBe(state);
    expect(reduce(state, { type: 'bid', playerId: state.currentTurn, amount: 99 })).toBe(state);
    expect(reduce(state, { type: 'resolveTrick' })).toBe(state);
  });

  it('resolver a mesma vaza duas vezes não duplica pontos', () => {
    let state = reduce(
      lobbyWithBots(1, { maxHandSize: 1 }),
      { type: 'startGame', by: 'me' },
      seeded(4),
    );
    for (let move = 0; move < 4; move++) state = playAsBot(state); // 2 palpites + 2 cartas
    expect(isTrickComplete(state)).toBe(true);

    const resolved = reduce(state, { type: 'resolveTrick' });
    expect(reduce(resolved, { type: 'resolveTrick' })).toBe(resolved);
    expect(resolved.players.reduce((sum, p) => sum + p.tricksWon, 0)).toBe(1);
  });

  it.each([
    [2, 'up' as const],
    [4, 'up_down' as const],
    [7, 'up' as const],
  ])('uma partida completa com %i jogadores termina com a pontuação correta', (n, gameMode) => {
    const ctx = seeded(n * 31);
    const start = reduce(lobbyWithBots(n - 1, { gameMode }), { type: 'startGame', by: 'me' }, ctx);
    const end = autoPlay(start, ctx);

    expect(end.phase).toBe('game_over');
    expect(end.roundIndex).toBe(end.roundSequence.length - 1);
    for (const r of end.roundResults ?? []) {
      expect(end.players.find((p) => p.id === r.playerId)?.score).toBe(r.totalScore);
    }
  });

  it('jogador que sai no meio da partida vira bot e o jogo segue', () => {
    let state = createGame({ maxHandSize: 2 }, { id: 'a', name: 'A' });
    state = reduce(state, { type: 'join', player: { id: 'b', name: 'B' } });
    state = reduce(state, { type: 'toggleReady', playerId: 'b' });
    state = reduce(state, { type: 'startGame', by: 'a' }, seeded(5));
    state = reduce(state, { type: 'leave', playerId: 'b' });
    expect(state.players.find((p) => p.id === 'b')?.isBot).toBe(true);
  });

  it('ausente é substituído por bot e retoma a cadeira ao voltar', () => {
    let state = createGame({}, { id: 'a', name: 'A' });
    state = reduce(state, { type: 'join', player: { id: 'b', name: 'B' } });
    state = reduce(state, { type: 'toggleReady', playerId: 'b' });
    state = reduce(state, { type: 'startGame', by: 'a' }, seeded(6));

    state = reduce(state, { type: 'setAway', playerId: 'b', away: true });
    expect(state.players.find((p) => p.id === 'b')?.isAway).toBe(true);

    state = reduce(state, { type: 'join', player: { id: 'b', name: 'B' } });
    expect(state.players.find((p) => p.id === 'b')?.isAway).toBe(false);
  });

  it('ausente na sala de espera é removido', () => {
    let state = createGame({}, { id: 'a', name: 'A' });
    state = reduce(state, { type: 'join', player: { id: 'b', name: 'B' } });
    state = reduce(state, { type: 'setAway', playerId: 'b', away: true });
    expect(state.players.map((p) => p.id)).toEqual(['a']);
  });
});
