import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useElementSize } from '../../hooks/useElementSize';
import type { Card } from '../../game/types';
import { CARD_RATIO, PlayingCard } from '../PlayingCard';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const RAISE = 16;

const useWindowHeight = () => {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return h;
};

interface HandProps {
  cards: Card[];
  /** Chave da rodada: força a animação de distribuição a cada rodada nova. */
  dealKey: string | number;
  interactive: boolean;
  canPlay: (card: Card) => boolean;
  selectedId: string | null;
  onSelect: (cardId: string | null) => void;
  onPlay: (card: Card) => void;
  /** Toque único joga a carta (mouse sempre joga com um clique). */
  quickPlay?: boolean;
}

/**
 * Leque de cartas que sempre cabe na largura da tela.
 * Toque: 1º toque seleciona (levanta a carta), 2º toque joga. Mouse: um clique joga.
 */
export const Hand = ({
  cards,
  dealKey,
  interactive,
  canPlay,
  selectedId,
  onSelect,
  onPlay,
  quickPlay = false,
}: HandProps) => {
  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const windowHeight = useWindowHeight();
  const pointerType = useRef<string>('mouse');

  const n = cards.length;
  const cardW = clamp(Math.min(width / 4.4, windowHeight * 0.14), 50, 120);
  const cardH = Math.round(cardW * CARD_RATIO);
  const step = n > 1 ? Math.min(cardW + 6, (width - cardW) / (n - 1)) : 0;
  const total = cardW + step * (n - 1);
  const offset = Math.max(0, (width - total) / 2);

  const handleClick = (card: Card) => {
    if (!interactive || !canPlay(card)) return;
    if (quickPlay || pointerType.current === 'mouse' || selectedId === card.id) {
      onSelect(null);
      onPlay(card);
    } else {
      onSelect(card.id);
    }
  };

  return (
    <div
      id="local-hand"
      ref={ref}
      className="relative mx-2 mb-2 shrink-0 sm:mx-auto sm:w-full sm:max-w-5xl"
      style={{ height: cardH + RAISE + 4 }}
      onPointerDown={(e: PointerEvent) => {
        pointerType.current = e.pointerType;
      }}
    >
      {width > 0 &&
        cards.map((card, i) => {
          const playable = interactive && canPlay(card);
          const selected = selectedId === card.id;
          return (
            <button
              key={`${dealKey}-${card.id}`}
              id={`card-${card.id}`}
              type="button"
              aria-label={`${card.rank} ${card.suit}`}
              aria-pressed={selected}
              disabled={!playable}
              onClick={() => handleClick(card)}
              className="absolute bottom-0 rounded-[9%/6.5%] transition-[left,translate] duration-200 ease-out disabled:cursor-default"
              style={{
                left: offset + i * step,
                translate: `0 ${selected ? -RAISE : 0}px`,
                zIndex: i + 1,
              }}
            >
              <PlayingCard
                card={card}
                width={cardW}
                dimmed={interactive && !playable}
                highlighted={selected}
                className={`animate-deal ${playable && !selected ? 'hover:-translate-y-2' : ''} transition-transform`}
                style={{ animationDelay: `${i * 45}ms` }}
              />
            </button>
          );
        })}
    </div>
  );
};
