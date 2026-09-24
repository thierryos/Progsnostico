import type { CSSProperties, HTMLAttributes } from 'react';
import type { Card } from '../game/types';
import { SUIT_TEXT, SuitIcon } from './SuitIcon';

/** Proporção de uma carta de baralho padrão (63 × 88 mm). */
export const CARD_RATIO = 88 / 63;

interface PlayingCardProps extends HTMLAttributes<HTMLDivElement> {
  card: Card;
  /** Largura em px; altura e fontes escalam junto (container queries). */
  width: number;
  dimmed?: boolean;
  highlighted?: boolean;
}

export const PlayingCard = ({
  card,
  width,
  dimmed = false,
  highlighted = false,
  className = '',
  style,
  ...props
}: PlayingCardProps) => {
  const size: CSSProperties = { width, height: Math.round(width * CARD_RATIO), ...style };
  const color = SUIT_TEXT[card.suit];

  return (
    <div
      className={[
        '@container relative shrink-0 rounded-[9%/6.5%] border border-slate-300 bg-white select-none',
        'shadow-[1px_2px_4px_rgb(0_0_0/0.45)]',
        dimmed ? 'brightness-50 grayscale' : '',
        highlighted ? 'ring-4 ring-balatro-gold' : '',
        className,
      ].join(' ')}
      style={size}
      aria-label={`${card.rank} ${card.suit}`}
      {...props}
    >
      <div
        className={`absolute top-[4%] left-[7%] flex flex-col items-center leading-none ${color}`}
      >
        <span className="text-[34cqw] font-bold tracking-tighter">{card.rank}</span>
        <SuitIcon suit={card.suit} className="-mt-[2cqw] size-[22cqw]" />
      </div>
      <SuitIcon
        suit={card.suit}
        className={`absolute top-1/2 left-1/2 size-[44cqw] -translate-x-1/2 -translate-y-[35%] opacity-90 ${color}`}
      />
    </div>
  );
};

export const CardBack = ({ width, className = '' }: { width: number; className?: string }) => (
  <div
    className={`shrink-0 rounded-[9%/6.5%] border-2 border-white/90 bg-balatro-red bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgb(0_0_0/0.15)_4px_8px)] shadow-md ${className}`}
    style={{ width, height: Math.round(width * CARD_RATIO) }}
    aria-hidden
  />
);
