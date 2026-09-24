import { Club, Diamond, Heart, Spade, type LucideProps } from 'lucide-react';
import type { Suit } from '../game/types';

const ICONS = { spades: Spade, hearts: Heart, diamonds: Diamond, clubs: Club } as const;

/** Classe de cor do naipe sobre fundo branco (a carta). */
export const SUIT_TEXT: Record<Suit, string> = {
  spades: 'text-suit-spades',
  clubs: 'text-suit-clubs',
  hearts: 'text-suit-hearts',
  diamonds: 'text-suit-diamonds',
};

/** Classe de cor do naipe sobre fundo escuro (interface). */
export const SUIT_TEXT_ON_DARK: Record<Suit, string> = {
  spades: 'text-slate-100',
  clubs: 'text-sky-400',
  hearts: 'text-red-400',
  diamonds: 'text-orange-400',
};

export const SuitIcon = ({ suit, ...props }: { suit: Suit } & LucideProps) => {
  const Icon = ICONS[suit];
  return <Icon fill="currentColor" strokeWidth={1.5} aria-hidden {...props} />;
};
