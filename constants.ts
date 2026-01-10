
import { Card, Rank, Suit } from './types';

export const SUIT_COLORS = {
  spades: 'text-slate-800',
  clubs: 'text-slate-800',
  hearts: 'text-balatro-red',
  diamonds: 'text-balatro-orange',
};

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const generateDeck = (): Card[] => {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}-${Math.random()}`,
        rank,
        suit,
        isSelected: false,
      });
    });
  });
  
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
};

export const MAX_PLAYERS = 7;

export const calculateRoundSequence = (numPlayers: number, mode: 'up' | 'up_down', maxHandSize?: number): number[] => {
  const absoluteMax = Math.floor(52 / numPlayers);
  
  const effectiveMax = maxHandSize && maxHandSize > 0 
    ? Math.min(maxHandSize, absoluteMax) 
    : absoluteMax;

  const rounds: number[] = [];

  for (let i = 1; i <= effectiveMax; i++) {
    rounds.push(i);
  }

  if (mode === 'up_down') {
    for (let i = effectiveMax - 1; i >= 1; i--) {
      rounds.push(i);
    }
  }

  return rounds;
};
