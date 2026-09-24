import type { Card, GameMode, Rank, Suit } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 7;
export const DECK_SIZE = 52;

/** Ordem de exibição: alterna cores para facilitar a leitura da mão. */
export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const cardId = (rank: Rank, suit: Suit) => `${rank}-${suit}`;

export const createCard = (rank: Rank, suit: Suit): Card => ({
  id: cardId(rank, suit),
  rank,
  suit,
});

export const createDeck = (): Card[] =>
  SUITS.flatMap((suit) => RANKS.map((rank) => createCard(rank, suit)));

export const shuffle = <T>(items: readonly T[], random: () => number): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** Agrupa por naipe (trunfo por último, à direita) e ordena do menor para o maior. */
export const sortHand = (hand: readonly Card[], trumpSuit: Suit | null = null): Card[] => {
  const suitOrder = (suit: Suit) => (suit === trumpSuit ? SUITS.length : SUITS.indexOf(suit));
  return [...hand].sort(
    (a, b) => suitOrder(a.suit) - suitOrder(b.suit) || RANK_VALUE[a.rank] - RANK_VALUE[b.rank],
  );
};

/** Máximo de cartas por jogador. Quando o baralho acaba exatamente, a rodada fica sem trunfo. */
export const maxCardsPerPlayer = (numPlayers: number) =>
  Math.floor(DECK_SIZE / Math.max(1, numPlayers));

export const roundSequence = (numPlayers: number, mode: GameMode, maxHandSize = 0): number[] => {
  const absoluteMax = maxCardsPerPlayer(numPlayers);
  const peak = maxHandSize > 0 ? Math.min(maxHandSize, absoluteMax) : absoluteMax;

  const up = Array.from({ length: peak }, (_, i) => i + 1);
  if (mode === 'up') return up;

  const down = up.slice(0, -1).reverse();
  return [...up, ...down];
};
