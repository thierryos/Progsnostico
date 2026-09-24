export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type GameMode = 'up' | 'up_down';

export type Phase = 'lobby' | 'bidding' | 'playing' | 'trick_summary' | 'round_end' | 'game_over';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  /** Bot adicionado pelo host (ou jogador que saiu no meio da partida). */
  isBot: boolean;
  /** Humano desconectado: um bot joga por ele até ele voltar. */
  isAway: boolean;
  hand: Card[];
  score: number;
  currentBid: number | null;
  tricksWon: number;
  isReady: boolean;
}

export interface RoomSettings {
  name: string;
  maxPlayers: number;
  gameMode: GameMode;
  /** Limite de cartas por mão. 0 = o máximo que o baralho permite. */
  maxHandSize: number;
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface TrickRecord {
  trickNumber: number;
  cards: PlayedCard[];
  winnerId: string;
  leadSuit: Suit;
}

export interface TrickResult {
  winnerId: string;
  winningCard: Card;
}

export interface RoundResult {
  playerId: string;
  playerName: string;
  bid: number;
  won: number;
  scoreDelta: number;
  totalScore: number;
}

export interface GameState {
  phase: Phase;
  settings: RoomSettings;
  players: Player[];
  roundSequence: number[];
  roundIndex: number;
  startPlayerIndex: number;
  /** Id de quem deve agir agora; '' quando ninguém (ex.: vaza completa aguardando resolução). */
  currentTurn: string;
  currentTrickLeader: string;
  trumpCard: Card | null;
  leadSuit: Suit | null;
  tableCards: PlayedCard[];
  trickHistory: TrickRecord[];
  trickResult: TrickResult | null;
  roundResults: RoundResult[] | null;
}

export type GameAction =
  | { type: 'join'; player: { id: string; name: string } }
  | { type: 'leave'; playerId: string }
  | { type: 'kick'; by: string; playerId: string }
  | { type: 'addBot'; by: string }
  | { type: 'updateSettings'; by: string; settings: Partial<RoomSettings> }
  | { type: 'toggleReady'; playerId: string }
  | { type: 'startGame'; by: string }
  | { type: 'bid'; playerId: string; amount: number }
  | { type: 'play'; playerId: string; cardId: string }
  | { type: 'botMove'; playerId: string }
  | { type: 'resolveTrick' }
  | { type: 'ready'; playerId: string }
  | { type: 'setAway'; playerId: string; away: boolean };

export type GameErrorCode = 'room_full' | 'game_started' | 'not_found' | 'wrong_password';

/** Erro de regra que deve ser mostrado ao jogador (ex.: sala cheia). */
export class GameRuleError extends Error {
  readonly code: GameErrorCode;

  constructor(code: GameErrorCode) {
    super(code);
    this.name = 'GameRuleError';
    this.code = code;
  }
}
