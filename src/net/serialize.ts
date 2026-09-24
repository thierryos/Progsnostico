/**
 * Conversão entre o GameState do motor e o formato do Realtime Database.
 *
 * O RTDB não guarda `null` nem arrays vazios, e pode devolver arrays como objetos
 * ({ "0": ..., "1": ... }). `deserializeGame` reconstrói um estado válido a partir
 * de qualquer uma dessas variações.
 */
import type {
  Card,
  GameState,
  Phase,
  PlayedCard,
  Player,
  RoundResult,
  Suit,
  TrickRecord,
} from '../game/types';

const PHASES: Phase[] = ['lobby', 'bidding', 'playing', 'trick_summary', 'round_end', 'game_over'];
const SUIT_SET = new Set<Suit>(['spades', 'hearts', 'diamonds', 'clubs']);

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null;

const list = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v.filter((x) => x != null);
  if (isObject(v)) return Object.values(v).filter((x) => x != null);
  return [];
};

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const bool = (v: unknown) => v === true;
const suit = (v: unknown): Suit | null => (SUIT_SET.has(v as Suit) ? (v as Suit) : null);

const card = (v: unknown): Card | null => {
  if (!isObject(v)) return null;
  const s = suit(v.suit);
  if (!s || typeof v.rank !== 'string' || typeof v.id !== 'string') return null;
  return { id: v.id, rank: v.rank as Card['rank'], suit: s };
};

const cards = (v: unknown): Card[] =>
  list(v)
    .map(card)
    .filter((c): c is Card => c !== null);

const played = (v: unknown): PlayedCard[] =>
  list(v).flatMap((p) => {
    if (!isObject(p)) return [];
    const c = card(p.card);
    return c ? [{ playerId: str(p.playerId), card: c }] : [];
  });

const player = (v: unknown): Player | null => {
  if (!isObject(v) || typeof v.id !== 'string' || !v.id) return null;
  return {
    id: v.id,
    name: str(v.name, 'Jogador'),
    isBot: bool(v.isBot),
    isAway: bool(v.isAway),
    hand: cards(v.hand),
    score: num(v.score),
    currentBid: typeof v.currentBid === 'number' ? v.currentBid : null,
    tricksWon: num(v.tricksWon),
    isReady: bool(v.isReady),
  };
};

const trick = (v: unknown): TrickRecord | null => {
  if (!isObject(v)) return null;
  const lead = suit(v.leadSuit);
  if (!lead) return null;
  return {
    trickNumber: num(v.trickNumber),
    cards: played(v.cards),
    winnerId: str(v.winnerId),
    leadSuit: lead,
  };
};

const result = (v: unknown): RoundResult | null => {
  if (!isObject(v)) return null;
  return {
    playerId: str(v.playerId),
    playerName: str(v.playerName),
    bid: num(v.bid),
    won: num(v.won),
    scoreDelta: num(v.scoreDelta),
    totalScore: num(v.totalScore),
  };
};

export const deserializeGame = (raw: unknown): GameState | null => {
  if (!isObject(raw) || !PHASES.includes(raw.phase as Phase)) return null;
  const settings = isObject(raw.settings) ? raw.settings : {};
  const trickResult = isObject(raw.trickResult) ? raw.trickResult : null;
  const winningCard = trickResult ? card(trickResult.winningCard) : null;
  const roundResults = list(raw.roundResults)
    .map(result)
    .filter((r): r is RoundResult => r !== null);

  return {
    phase: raw.phase as Phase,
    settings: {
      name: str(settings.name, 'Mesa'),
      maxPlayers: num(settings.maxPlayers, 4),
      gameMode: settings.gameMode === 'up_down' ? 'up_down' : 'up',
      maxHandSize: num(settings.maxHandSize),
    },
    players: list(raw.players)
      .map(player)
      .filter((p): p is Player => p !== null),
    roundSequence: list(raw.roundSequence).filter((n): n is number => typeof n === 'number'),
    roundIndex: num(raw.roundIndex),
    startPlayerIndex: num(raw.startPlayerIndex),
    currentTurn: str(raw.currentTurn),
    currentTrickLeader: str(raw.currentTrickLeader),
    trumpCard: card(raw.trumpCard),
    leadSuit: suit(raw.leadSuit),
    tableCards: played(raw.tableCards),
    trickHistory: list(raw.trickHistory)
      .map(trick)
      .filter((t): t is TrickRecord => t !== null),
    trickResult:
      trickResult && winningCard ? { winnerId: str(trickResult.winnerId), winningCard } : null,
    roundResults: roundResults.length > 0 ? roundResults : null,
  };
};

/** JSON puro: remove `undefined` (que o RTDB rejeita). `null` vira "campo ausente". */
export const serializeGame = (state: GameState): Raw => JSON.parse(JSON.stringify(state)) as Raw;
