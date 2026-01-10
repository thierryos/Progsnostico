
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Language = 'pt' | 'en' | 'es';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isSelected: boolean;
  modifier?: 'foil' | 'holographic' | 'gold' | null; 
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isLocal: boolean;
  score: number;
  currentBid: number | null; 
  tricksWon: number; 
  isReady: boolean; 
  isHost?: boolean; 
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface TrickRecord {
  round: number;
  trickNumber: number;
  cards: PlayedCard[];
  winnerId: string;
  leadSuit: Suit | null;
}

export interface RoundResult {
  playerId: string;
  playerName: string;
  bid: number;
  won: number;
  scoreDelta: number;
  totalScore: number;
  isLocal: boolean;
  isReady: boolean;
}

export type GamePhase = 'menu' | 'room_browser' | 'waiting_room' | 'dealing' | 'bidding' | 'playing' | 'trick_result' | 'trick_summary' | 'round_end' | 'game_over' | 'tutorial';

export interface RoomConfig {
  id: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
  gameMode: 'up' | 'up_down'; 
  maxHandSize?: number; 
  players: Player[];
  status: 'open' | 'playing';
  totalRounds: number;
}

export interface GameState {
  status: GamePhase;
  currentTurn: string; 
  startPlayerIndex: number; 
  currentTrickLeader: string;
  round: number;
  roundIndex: number; 
  roundSequence: number[]; 
  totalRounds: number;
  trumpCard: Card | null;
  tableCards: PlayedCard[];
  trickHistory: TrickRecord[]; 
  trickResult?: { winnerId: string; winningCard: Card; pointsAdded: number };
  roundResults?: RoundResult[];
  leadSuit: Suit | null; 
  players: Player[];
  deck: Card[];
  currentRoom?: RoomConfig;
}

export interface TutorialStep {
  id: number;
  textKey: string;
  highlightId?: string;
  position: 'top' | 'bottom' | 'center'; 
  actionRequired?: 'bid' | 'play_card' | 'next' | 'click_history' | 'click_help';
}

export interface Joker {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  imageType: string;
}
