import { Crown } from 'lucide-react';
import { useRef, type HTMLAttributes, type PointerEvent } from 'react';
import type { Card } from '../game/types';
import { SUIT_TEXT, SuitIcon } from './SuitIcon';

/** Proporção de uma carta de baralho padrão (63 × 88 mm). */
export const CARD_RATIO = 88 / 63;

/** Inclinação máxima (graus) quando o mouse passa sobre a carta. */
const MAX_TILT = 14;

interface PlayingCardProps extends HTMLAttributes<HTMLDivElement> {
  card: Card;
  /** Largura em px; altura e fontes escalam junto (container queries). */
  width: number;
  dimmed?: boolean;
  highlighted?: boolean;
  /** Faixa de brilho que atravessa a carta uma vez (carta vencedora). */
  shine?: boolean;
  /** Carta do naipe de trunfo: película holográfica + coroa. */
  trump?: boolean;
  /** Inclina em 3D seguindo o mouse, com reflexo que acompanha. */
  tilt?: boolean;
  /** Balanço 3D em repouso; o número defasa a animação entre cartas vizinhas. */
  idle?: number | false;
}

/**
 * Carta em camadas (estilo Balatro):
 * - raiz: tamanho, perspectiva e classes/animações de quem usa (entrada, leque);
 * - corpo: balanço em repouso (propriedade `rotate`) + inclinação do mouse (`transform`),
 *   que se combinam sem uma animação sobrescrever a outra;
 * - face: papel, índices, película de trunfo e reflexos.
 */
export const PlayingCard = ({
  card,
  width,
  dimmed = false,
  highlighted = false,
  shine = false,
  trump = false,
  tilt = false,
  idle = false,
  className = '',
  style,
  ...props
}: PlayingCardProps) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const height = Math.round(width * CARD_RATIO);
  const color = SUIT_TEXT[card.suit];

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = bodyRef.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * MAX_TILT * 2}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * MAX_TILT * 2}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.dataset.hover = 'on';
  };

  const onPointerLeave = () => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    delete el.dataset.hover;
  };

  return (
    <div
      className={`relative shrink-0 select-none ${className}`}
      style={{ width, height, perspective: width * 7, ...style }}
      aria-label={`${card.rank} ${card.suit}${trump ? ' (trunfo)' : ''}`}
      onPointerMove={tilt ? onPointerMove : undefined}
      onPointerLeave={tilt ? onPointerLeave : undefined}
      {...props}
    >
      <div
        ref={bodyRef}
        className={[
          'group/card @container relative h-full w-full overflow-hidden rounded-[9%/6.5%] border border-slate-400',
          'transition-transform duration-200 ease-out',
          '[transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]',
          // Papel levemente amarelado embaixo + borda impressa + sombra em camadas.
          'bg-[linear-gradient(180deg,#ffffff_0%,#f4f1ea_100%)]',
          'shadow-[inset_0_0_0_2px_#fff,inset_0_0_0_3px_rgb(15_23_42/0.08),0_1px_1px_rgb(0_0_0/0.35),0_5px_12px_rgb(0_0_0/0.35)]',
          idle !== false ? 'animate-card-idle' : '',
          dimmed ? 'brightness-[0.62] saturate-[0.35]' : '',
          highlighted
            ? 'ring-[3px] ring-balatro-gold drop-shadow-[0_0_10px_rgb(234_179_8/0.6)]'
            : trump
              ? 'ring-2 ring-balatro-gold/80'
              : '',
        ].join(' ')}
        style={idle !== false ? { animationDelay: `${-((idle * 1.3) % 5)}s` } : undefined}
      >
        {trump && (
          <span
            aria-hidden
            className="foil pointer-events-none absolute inset-0 animate-foil mix-blend-multiply"
          />
        )}

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

        {trump && (
          <span
            aria-hidden
            className="absolute top-[4%] right-[5%] grid size-[26cqw] place-items-center rounded-full bg-balatro-gold text-amber-950 shadow-[0_1px_0_#854d0e]"
          >
            <Crown className="size-[16cqw]" strokeWidth={2.5} />
          </span>
        )}

        {/* Volume: leve sombreado no canto inferior, como papel sob luz de cima. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,transparent_55%,rgb(15_23_42/0.07)_100%)]"
        />
        {/* Reflexo que segue o mouse (só aparece enquanto inclina). */}
        {tilt && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--mx,50%)_var(--my,0%),rgb(255_255_255/0.6),transparent_55%)] opacity-0 mix-blend-soft-light transition-opacity duration-200 group-data-[hover=on]/card:opacity-100"
          />
        )}
        {shine && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-shine bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.85),transparent)]"
          />
        )}
      </div>
    </div>
  );
};
