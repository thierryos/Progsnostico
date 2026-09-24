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
  /** Faixa de brilho que atravessa a carta uma vez (carta vencedora). */
  shine?: boolean;
}

export const PlayingCard = ({
  card,
  width,
  dimmed = false,
  highlighted = false,
  shine = false,
  className = '',
  style,
  ...props
}: PlayingCardProps) => {
  const size: CSSProperties = { width, height: Math.round(width * CARD_RATIO), ...style };
  const color = SUIT_TEXT[card.suit];

  return (
    <div
      className={[
        '@container relative shrink-0 overflow-hidden rounded-[9%/6.5%] border border-slate-400 select-none',
        // Papel levemente amarelado embaixo + borda impressa por dentro.
        'bg-[linear-gradient(180deg,#ffffff_0%,#f4f1ea_100%)]',
        // Sombra em camadas: contato curto + sombra projetada suave.
        'shadow-[inset_0_0_0_2px_#fff,inset_0_0_0_3px_rgb(15_23_42/0.08),0_1px_1px_rgb(0_0_0/0.35),0_5px_12px_rgb(0_0_0/0.35)]',
        dimmed ? 'brightness-[0.62] saturate-[0.35]' : '',
        highlighted ? 'ring-[3px] ring-balatro-gold drop-shadow-[0_0_10px_rgb(234_179_8/0.6)]' : '',
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
      {/* Volume: leve sombreado no canto inferior, como papel sob luz de cima. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,transparent_55%,rgb(15_23_42/0.07)_100%)]"
      />
      {shine && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-shine bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.85),transparent)]"
        />
      )}
    </div>
  );
};
