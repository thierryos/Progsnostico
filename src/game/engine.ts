/**
 * Motor de regras puro do Prognóstico.
 *
 * `reduce(state, action)` nunca muta o estado recebido e não tem efeitos colaterais.
 * Quando a ação é inválida (fora de turno, carta ilegal, ação repetida), devolve o
 * MESMO objeto `state` — quem chama usa isso para descartar a ação (no Firebase, a
 * transação é abortada). Erros que o jogador precisa ver lançam `GameRuleError`.
 *
 * O mesmo motor roda no modo offline, no tutorial e em cada cliente online, dentro
 * de uma transação sobre o estado remoto.
 */
import { chooseBid, chooseCard } from './bot';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  createDeck,
  maxCardsPerPlayer,
  roundSequence,
  shuffle,
  sortHand,
} from './cards';
import { isValidMove, scoreRound, winningPlay } from './rules';
import {
  GameRuleError,
  type GameAction,
  type GameState,
  type Player,
  type RoomSettings,
} from './types';

export interface EngineContext {
  random: () => number;
}

const defaultContext: EngineContext = { random: Math.random };

export const MAX_NAME_LENGTH = 16;
export const MAX_ROOM_NAME_LENGTH = 24;

export const DEFAULT_SETTINGS: RoomSettings = {
  name: 'Mesa',
  maxPlayers: 4,
  gameMode: 'up',
  maxHandSize: 0,
};

export const createPlayer = (id: string, name: string, isBot = false): Player => ({
  id,
  name: name.trim().slice(0, MAX_NAME_LENGTH) || 'Jogador',
  isBot,
  isAway: false,
  hand: [],
  score: 0,
  currentBid: null,
  tricksWon: 0,
  isReady: isBot,
});

export const sanitizeSettings = (
  current: RoomSettings,
  patch: Partial<RoomSettings>,
  playerCount: number,
): RoomSettings => {
  const next = { ...current, ...patch };
  const minPlayers = Math.max(MIN_PLAYERS, playerCount);
  return {
    name: (next.name ?? '').trim().slice(0, MAX_ROOM_NAME_LENGTH) || current.name,
    maxPlayers: clampInt(next.maxPlayers, minPlayers, MAX_PLAYERS),
    gameMode: next.gameMode === 'up_down' ? 'up_down' : 'up',
    maxHandSize: clampInt(next.maxHandSize, 0, maxCardsPerPlayer(MIN_PLAYERS)),
  };
};

export const createGame = (
  settings: Partial<RoomSettings>,
  host: { id: string; name: string },
): GameState => ({
  phase: 'lobby',
  settings: sanitizeSettings(DEFAULT_SETTINGS, settings, 1),
  players: [createPlayer(host.id, host.name)],
  roundSequence: [],
  roundIndex: 0,
  startPlayerIndex: 0,
  currentTurn: '',
  currentTrickLeader: '',
  trumpCard: null,
  leadSuit: null,
  tableCards: [],
  trickHistory: [],
  trickResult: null,
  roundResults: null,
});

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export const isAutomated = (p: Player) => p.isBot || p.isAway;

export const humanPlayers = (state: GameState) => state.players.filter((p) => !p.isBot);

/** O host é o primeiro humano da lista: ele controla as configurações da sala. */
export const getHostId = (state: GameState) => humanPlayers(state)[0]?.id ?? '';

export const isInGame = (state: GameState) =>
  state.phase !== 'lobby' && state.phase !== 'game_over';

export const isTrickComplete = (state: GameState) =>
  state.phase === 'playing' &&
  state.players.length > 0 &&
  state.tableCards.length === state.players.length;

export const cardsThisRound = (state: GameState) => state.roundSequence[state.roundIndex] ?? 0;

export const nextPlayerId = (state: GameState, playerId: string) => {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0 || state.players.length === 0) return '';
  return state.players[(idx + 1) % state.players.length].id;
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export const reduce = (
  state: GameState,
  action: GameAction,
  ctx: EngineContext = defaultContext,
): GameState => {
  switch (action.type) {
    case 'join':
      return join(state, action.player);
    case 'leave':
      return leave(state, action.playerId, ctx);
    case 'kick':
      if (state.phase !== 'lobby' || getHostId(state) !== action.by) return state;
      if (action.by === action.playerId) return state;
      return removePlayer(state, action.playerId);
    case 'addBot':
      return addBot(state, action.by);
    case 'updateSettings':
      if (state.phase !== 'lobby' || getHostId(state) !== action.by) return state;
      return {
        ...state,
        settings: sanitizeSettings(state.settings, action.settings, state.players.length),
      };
    case 'toggleReady':
      if (state.phase !== 'lobby') return state;
      return updatePlayer(state, action.playerId, (p) =>
        p.isBot ? p : { ...p, isReady: !p.isReady },
      );
    case 'startGame':
      return startGame(state, action.by, ctx);
    case 'bid':
      return bid(state, action.playerId, action.amount);
    case 'play':
      return play(state, action.playerId, action.cardId);
    case 'botMove':
      return botMove(state, action.playerId);
    case 'resolveTrick':
      return resolveTrick(state);
    case 'ready':
      return ready(state, action.playerId, ctx);
    case 'setAway':
      return setAway(state, action.playerId, action.away, ctx);
    default:
      return state;
  }
};

const join = (state: GameState, player: { id: string; name: string }): GameState => {
  const existing = state.players.find((p) => p.id === player.id);
  if (existing) {
    if (existing.isBot) throw new GameRuleError('game_started');
    return existing.isAway
      ? updatePlayer(state, player.id, (p) => ({ ...p, isAway: false }))
      : state;
  }
  if (state.phase !== 'lobby') throw new GameRuleError('game_started');
  if (state.players.length >= state.settings.maxPlayers) throw new GameRuleError('room_full');
  return { ...state, players: [...state.players, createPlayer(player.id, player.name)] };
};

const leave = (state: GameState, playerId: string, ctx: EngineContext): GameState => {
  if (!state.players.some((p) => p.id === playerId)) return state;
  if (!isInGame(state)) return removePlayer(state, playerId);
  // No meio da partida, a cadeira vira bot para o jogo continuar.
  const next = updatePlayer(state, playerId, (p) => ({
    ...p,
    isBot: true,
    isAway: false,
    isReady: true,
  }));
  return maybeAdvance(next, ctx);
};

const removePlayer = (state: GameState, playerId: string): GameState => {
  if (!state.players.some((p) => p.id === playerId)) return state;
  return { ...state, players: state.players.filter((p) => p.id !== playerId) };
};

const addBot = (state: GameState, by: string): GameState => {
  if (state.phase !== 'lobby' || getHostId(state) !== by) return state;
  if (state.players.length >= state.settings.maxPlayers) return state;
  const used = new Set(state.players.map((p) => p.id));
  let n = 1;
  while (used.has(`bot-${n}`)) n++;
  return { ...state, players: [...state.players, createPlayer(`bot-${n}`, `Bot ${n}`, true)] };
};

const startGame = (state: GameState, by: string, ctx: EngineContext): GameState => {
  if (state.phase !== 'lobby' || getHostId(state) !== by) return state;
  if (state.players.length < MIN_PLAYERS) return state;
  // O host confirma ao clicar em "Iniciar"; os demais precisam estar prontos.
  if (!state.players.every((p) => p.isReady || p.id === by)) return state;

  const sequence = roundSequence(
    state.players.length,
    state.settings.gameMode,
    state.settings.maxHandSize,
  );
  return dealRound(
    {
      ...state,
      roundSequence: sequence,
      roundIndex: 0,
      startPlayerIndex: 0,
      players: state.players.map((p) => ({ ...p, score: 0 })),
    },
    ctx,
  );
};

const dealRound = (state: GameState, ctx: EngineContext): GameState => {
  const cards = cardsThisRound(state);
  const deck = shuffle(createDeck(), ctx.random);
  const hands = state.players.map((_, i) => deck.slice(i * cards, (i + 1) * cards));
  const trumpCard = deck[state.players.length * cards] ?? null;
  const starter = state.players[state.startPlayerIndex]?.id ?? '';

  return {
    ...state,
    phase: 'bidding',
    players: state.players.map((p, i) => ({
      ...p,
      hand: sortHand(hands[i], trumpCard?.suit ?? null),
      currentBid: null,
      tricksWon: 0,
      isReady: false,
    })),
    trumpCard,
    leadSuit: null,
    tableCards: [],
    trickHistory: [],
    trickResult: null,
    roundResults: null,
    currentTurn: starter,
    currentTrickLeader: starter,
  };
};

const bid = (state: GameState, playerId: string, amount: number): GameState => {
  if (state.phase !== 'bidding' || state.currentTurn !== playerId) return state;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.currentBid !== null) return state;
  if (!Number.isInteger(amount) || amount < 0 || amount > player.hand.length) return state;

  const players = state.players.map((p) => (p.id === playerId ? { ...p, currentBid: amount } : p));
  const everyoneBid = players.every((p) => p.currentBid !== null);
  const leader = state.players[state.startPlayerIndex]?.id ?? '';

  return {
    ...state,
    players,
    phase: everyoneBid ? 'playing' : 'bidding',
    currentTurn: everyoneBid ? leader : nextPlayerId(state, playerId),
    currentTrickLeader: everyoneBid ? leader : state.currentTrickLeader,
  };
};

const play = (state: GameState, playerId: string, cardId: string): GameState => {
  if (state.phase !== 'playing' || state.currentTurn !== playerId) return state;
  const player = state.players.find((p) => p.id === playerId);
  const card = player?.hand.find((c) => c.id === cardId);
  if (!player || !card || !isValidMove(card, player.hand, state.leadSuit)) return state;

  const tableCards = [...state.tableCards, { playerId, card }];
  const trickDone = tableCards.length === state.players.length;

  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, hand: p.hand.filter((c) => c.id !== cardId) } : p,
    ),
    tableCards,
    leadSuit: state.leadSuit ?? card.suit,
    // Vaza completa: ninguém joga até `resolveTrick`.
    currentTurn: trickDone ? '' : nextPlayerId(state, playerId),
  };
};

const botMove = (state: GameState, playerId: string): GameState => {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !isAutomated(player) || state.currentTurn !== playerId) return state;

  const trumpSuit = state.trumpCard?.suit ?? null;
  if (state.phase === 'bidding') {
    return bid(state, playerId, chooseBid(player.hand, trumpSuit));
  }
  if (state.phase === 'playing' && player.hand.length > 0) {
    const card = chooseCard({
      hand: player.hand,
      leadSuit: state.leadSuit,
      tableCards: state.tableCards,
      trumpSuit,
      bid: player.currentBid,
      tricksWon: player.tricksWon,
    });
    return play(state, playerId, card.id);
  }
  return state;
};

const resolveTrick = (state: GameState): GameState => {
  if (!isTrickComplete(state)) return state;
  const winner = winningPlay(state.tableCards, state.trumpCard?.suit ?? null);

  return {
    ...state,
    phase: 'trick_summary',
    players: state.players.map((p) => ({
      ...p,
      tricksWon: p.id === winner.playerId ? p.tricksWon + 1 : p.tricksWon,
      isReady: isAutomated(p),
    })),
    trickHistory: [
      ...state.trickHistory,
      {
        trickNumber: state.trickHistory.length + 1,
        cards: state.tableCards,
        winnerId: winner.playerId,
        leadSuit: state.tableCards[0].card.suit,
      },
    ],
    trickResult: { winnerId: winner.playerId, winningCard: winner.card },
    currentTurn: '',
  };
};

const ready = (state: GameState, playerId: string, ctx: EngineContext): GameState => {
  if (state.phase !== 'trick_summary' && state.phase !== 'round_end') return state;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isReady) return state;
  return maybeAdvance(
    updatePlayer(state, playerId, (p) => ({ ...p, isReady: true })),
    ctx,
  );
};

const setAway = (
  state: GameState,
  playerId: string,
  away: boolean,
  ctx: EngineContext,
): GameState => {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isBot || player.isAway === away) return state;
  if (away && state.phase === 'lobby') return removePlayer(state, playerId);

  const next = updatePlayer(state, playerId, (p) => ({
    ...p,
    isAway: away,
    isReady:
      away && (state.phase === 'trick_summary' || state.phase === 'round_end') ? true : p.isReady,
  }));
  return away ? maybeAdvance(next, ctx) : next;
};

/** Avança o jogo quando todos confirmaram o resumo da vaza ou da rodada. */
const maybeAdvance = (state: GameState, ctx: EngineContext): GameState => {
  if (!state.players.every((p) => p.isReady)) return state;

  if (state.phase === 'trick_summary') {
    const winnerId = state.trickResult?.winnerId ?? state.currentTrickLeader;
    if (state.players.every((p) => p.hand.length === 0)) return finishRound(state);
    return {
      ...state,
      phase: 'playing',
      tableCards: [],
      leadSuit: null,
      trickResult: null,
      currentTurn: winnerId,
      currentTrickLeader: winnerId,
      players: state.players.map((p) => ({ ...p, isReady: false })),
    };
  }

  if (state.phase === 'round_end') {
    const nextIndex = state.roundIndex + 1;
    if (nextIndex >= state.roundSequence.length) {
      return { ...state, phase: 'game_over', currentTurn: '' };
    }
    return dealRound(
      {
        ...state,
        roundIndex: nextIndex,
        startPlayerIndex: (state.startPlayerIndex + 1) % state.players.length,
      },
      ctx,
    );
  }

  return state;
};

const finishRound = (state: GameState): GameState => {
  const roundResults = state.players.map((p) => {
    const bidValue = p.currentBid ?? 0;
    const scoreDelta = scoreRound(bidValue, p.tricksWon);
    return {
      playerId: p.id,
      playerName: p.name,
      bid: bidValue,
      won: p.tricksWon,
      scoreDelta,
      totalScore: p.score + scoreDelta,
    };
  });

  return {
    ...state,
    phase: 'round_end',
    roundResults,
    players: state.players.map((p, i) => ({
      ...p,
      score: roundResults[i].totalScore,
      isReady: isAutomated(p),
    })),
    tableCards: [],
    leadSuit: null,
    trickResult: null,
    currentTurn: '',
  };
};

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const updatePlayer = (state: GameState, playerId: string, fn: (p: Player) => Player): GameState => {
  let changed = false;
  const players = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const next = fn(p);
    changed ||= next !== p;
    return next;
  });
  return changed ? { ...state, players } : state;
};

const clampInt = (value: unknown, min: number, max: number) => {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};
