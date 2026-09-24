import { RANK_VALUE } from './cards';
import type { Card, PlayedCard, Suit } from './types';

export const EXACT_BID_BONUS = 5;

/** Regra de ouro: quem tem o naipe puxado é obrigado a segui-lo. */
export const isValidMove = (card: Card, hand: readonly Card[], leadSuit: Suit | null): boolean => {
  if (!leadSuit || card.suit === leadSuit) return true;
  return !hand.some((c) => c.suit === leadSuit);
};

export const playableCards = (hand: readonly Card[], leadSuit: Suit | null): Card[] =>
  hand.filter((card) => isValidMove(card, hand, leadSuit));

/**
 * Força da carta dentro de uma vaza: trunfo > naipe puxado > descarte.
 * Descartes (outro naipe, sem ser trunfo) nunca vencem.
 */
export const cardStrength = (card: Card, leadSuit: Suit, trumpSuit: Suit | null): number => {
  const value = RANK_VALUE[card.rank];
  if (card.suit === trumpSuit) return 200 + value;
  if (card.suit === leadSuit) return 100 + value;
  return value;
};

export const winningPlay = (cards: readonly PlayedCard[], trumpSuit: Suit | null): PlayedCard => {
  if (cards.length === 0) throw new Error('winningPlay: vaza vazia');
  const leadSuit = cards[0].card.suit;
  return cards.reduce((best, current) =>
    cardStrength(current.card, leadSuit, trumpSuit) > cardStrength(best.card, leadSuit, trumpSuit)
      ? current
      : best,
  );
};

/** 1 ponto por vaza + bônus quando o palpite é exato. */
export const scoreRound = (bid: number, won: number) => won + (bid === won ? EXACT_BID_BONUS : 0);
