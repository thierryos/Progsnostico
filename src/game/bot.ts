import { RANK_VALUE } from './cards';
import { cardStrength, playableCards, winningPlay } from './rules';
import type { Card, PlayedCard, Suit } from './types';

/** Estima quantas vazas a mão vence: cartas altas e trunfos contam. */
export const chooseBid = (hand: readonly Card[], trumpSuit: Suit | null): number => {
  const estimate = hand.reduce((sum, card) => {
    const value = RANK_VALUE[card.rank];
    if (card.suit === trumpSuit) {
      if (value >= 11) return sum + 1;
      if (value >= 7) return sum + 0.5;
      return sum;
    }
    if (value === 14) return sum + 1;
    if (value === 13) return sum + 0.5;
    return sum;
  }, 0);
  return Math.max(0, Math.min(hand.length, Math.round(estimate)));
};

interface PlayContext {
  hand: readonly Card[];
  leadSuit: Suit | null;
  tableCards: readonly PlayedCard[];
  trumpSuit: Suit | null;
  bid: number | null;
  tricksWon: number;
}

const byStrength = (leadSuit: Suit, trumpSuit: Suit | null) => (a: Card, b: Card) =>
  cardStrength(a, leadSuit, trumpSuit) - cardStrength(b, leadSuit, trumpSuit) ||
  RANK_VALUE[a.rank] - RANK_VALUE[b.rank];

/**
 * Se ainda precisa de vazas, tenta vencer gastando o mínimo possível;
 * se já cumpriu o palpite, tenta perder descartando a carta mais alta que não vence.
 */
export const chooseCard = ({
  hand,
  leadSuit,
  tableCards,
  trumpSuit,
  bid,
  tricksWon,
}: PlayContext): Card => {
  const options = playableCards(hand, leadSuit);
  if (options.length === 0) throw new Error('chooseCard: mão vazia');

  const wantsTricks = bid === null || tricksWon < bid;

  if (tableCards.length === 0) {
    const ownStrength = (c: Card) => cardStrength(c, c.suit, trumpSuit);
    const sorted = [...options].sort((a, b) => ownStrength(a) - ownStrength(b));
    return wantsTricks ? sorted[sorted.length - 1] : sorted[0];
  }

  const lead = tableCards[0].card.suit;
  const best = winningPlay(tableCards, trumpSuit);
  const bestStrength = cardStrength(best.card, lead, trumpSuit);
  const sorted = [...options].sort(byStrength(lead, trumpSuit));
  const winners = sorted.filter((c) => cardStrength(c, lead, trumpSuit) > bestStrength);
  const losers = sorted.filter((c) => cardStrength(c, lead, trumpSuit) < bestStrength);

  if (wantsTricks) return winners[0] ?? sorted[0];
  return losers[losers.length - 1] ?? sorted[sorted.length - 1];
};
