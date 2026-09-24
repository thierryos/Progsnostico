import { CARD_RATIO } from '../PlayingCard';

/** Altura do rótulo com o nome embaixo da carta (inclui a margem). */
export const LABEL_H = 24;
/** Sobreposição tolerada entre blocos vizinhos (as cartas ficam levemente inclinadas). */
export const OVERLAP_TOLERANCE = 10;
/** A carta vencedora da vaza cresce um pouco; o layout reserva espaço para isso. */
export const WINNER_SCALE = 1.06;
const GAP = 6;
const PAD = 10;
const MIN_W = 36;
const MAX_W = 104;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

type Point = { x: number; y: number };

export interface TableLayout {
  mode: 'ring' | 'row';
  cardW: number;
  /** Centro do bloco carta + nome. `seat` 0 = você; `order` = ordem em que a carta foi jogada. */
  position: (seat: number, order: number) => Point;
}

const blockHeight = (cardW: number) => cardW * CARD_RATIO + LABEL_H;

/** Maior sobreposição entre dois blocos (negativo = há folga em algum eixo). */
const worstOverlap = (points: Point[], cardW: number) => {
  const bh = blockHeight(cardW);
  let worst = -Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const ox = cardW - Math.abs(points[i].x - points[j].x);
      const oy = bh - Math.abs(points[i].y - points[j].y);
      worst = Math.max(worst, Math.min(ox, oy));
    }
  }
  return worst;
};

const ring = (width: number, height: number, n: number, cardW: number): TableLayout | null => {
  const block = blockHeight(cardW);
  const ryMax = height / 2 - block / 2 - PAD;
  const rxMax = width / 2 - cardW / 2 - PAD;
  if (ryMax < block / 2 + GAP || rxMax < cardW + GAP) return null;

  // Com poucos jogadores as cartas ficam mais juntas no centro; com muitos, usa a mesa toda.
  const spread = n <= 4 ? 0.62 : 1;
  const ry = Math.min(ryMax, Math.max(block / 2 + GAP, ryMax * spread));
  const rx = Math.min(rxMax, Math.max(cardW + GAP, rxMax * spread));
  return {
    mode: 'ring',
    cardW,
    position: (seat) => {
      const angle = ((90 + (seat * 360) / n) * Math.PI) / 180;
      return { x: width / 2 + rx * Math.cos(angle), y: height / 2 + ry * Math.sin(angle) };
    },
  };
};

const row = (width: number, height: number, n: number): TableLayout => {
  const cardW = clamp(
    Math.min((height - LABEL_H - 2 * PAD) / CARD_RATIO / WINNER_SCALE, (width - 2 * PAD) / n - GAP),
    MIN_W,
    MAX_W,
  );
  const step = n > 1 ? Math.min(cardW + GAP, (width - 2 * PAD - cardW) / (n - 1)) : 0;
  const start = width / 2 - (step * (n - 1)) / 2;
  return {
    mode: 'row',
    cardW,
    position: (_seat, order) => ({ x: start + order * step, y: height / 2 }),
  };
};

/**
 * Onde cada carta jogada fica na mesa.
 * - `ring`: no assento de quem jogou (você embaixo, os demais no sentido do jogo).
 *   Diminui as cartas até os assentos vizinhos não se cobrirem.
 * - `row`: quando o anel não cabe (mesa baixa, celular deitado): lado a lado, na ordem jogada.
 */
export const layoutTable = (width: number, height: number, players: number): TableLayout => {
  const n = Math.max(1, players);
  const seats = Array.from({ length: n }, (_, i) => i);

  for (let w = clamp(Math.min(width / 5, height / 3.2), MIN_W, MAX_W); w >= MIN_W; w *= 0.92) {
    const layout = ring(width, height, n, w);
    if (!layout) break;
    const points = seats.map((s) => layout.position(s, s));
    if (worstOverlap(points, w) <= OVERLAP_TOLERANCE) return layout;
  }
  return row(width, height, n);
};
