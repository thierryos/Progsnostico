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

/** Retângulo reservado na mesa (canto superior esquerdo `x,y`). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Selo "naipe puxado" no canto superior esquerdo. */
export const LEAD_CHIP: Rect = { x: 10, y: 10, w: 128, h: 50 };

/** Painel horizontal do trunfo (carta + texto) no canto superior direito. */
export const trumpPanel = (width: number) => {
  const cardW = clamp(width / 9, 36, 56);
  const w = cardW + 100;
  // Altura suficiente para a carta e para as 4 linhas de texto ao lado.
  const h = Math.max(cardW * CARD_RATIO, 74) + 12;
  return { cardW, rect: { x: width - w - 10, y: 10, w, h } };
};

/** Sobreposição entre um bloco de carta (centro `p`) e um retângulo reservado. */
const rectOverlap = (p: Point, cardW: number, r: Rect) => {
  const bh = blockHeight(cardW);
  const ox = Math.min(p.x + cardW / 2, r.x + r.w) - Math.max(p.x - cardW / 2, r.x);
  const oy = Math.min(p.y + bh / 2, r.y + r.h) - Math.max(p.y - bh / 2, r.y);
  return Math.min(ox, oy);
};

export interface TableLayout {
  mode: 'ring' | 'row';
  cardW: number;
  /** Centro do bloco carta + nome. `seat` 0 = você; `order` = ordem em que a carta foi jogada. */
  position: (seat: number, order: number) => Point;
}

/** Altura do bloco carta + nome. */
export function blockHeight(cardW: number) {
  return cardW * CARD_RATIO + LABEL_H;
}

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

/** Anel de assentos; `top` desloca a área útil para baixo (livra a faixa dos cantos). */
const ring = (
  width: number,
  height: number,
  n: number,
  cardW: number,
  top = 0,
): TableLayout | null => {
  const block = blockHeight(cardW);
  const areaH = height - top;
  const cy = top + areaH / 2;
  const ryMax = areaH / 2 - block / 2 - PAD;
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
      return { x: width / 2 + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
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
 *   Diminui as cartas até os assentos vizinhos não se cobrirem nem cobrirem os cantos
 *   reservados (`reserved`: selo do naipe puxado e painel do trunfo).
 * - `row`: quando o anel não cabe (mesa baixa, celular deitado): lado a lado, na ordem jogada.
 */
export const layoutTable = (
  width: number,
  height: number,
  players: number,
  reserved: readonly Rect[] = [],
): TableLayout => {
  const n = Math.max(1, players);
  const seats = Array.from({ length: n }, (_, i) => i);
  // 1ª tentativa: mesa inteira; 2ª: só abaixo da faixa ocupada pelos cantos reservados.
  const band = reserved.reduce((max, r) => Math.max(max, r.y + r.h), 0);

  for (const top of band > 0 ? [0, band] : [0]) {
    const start = clamp(Math.min(width / 5, (height - top) / 3.2), MIN_W, MAX_W);
    for (let w = start; w >= MIN_W; w *= 0.92) {
      const layout = ring(width, height, n, w, top);
      if (!layout) break;
      const points = seats.map((s) => layout.position(s, s));
      const clear = points.every((p) =>
        reserved.every((r) => rectOverlap(p, w, r) <= OVERLAP_TOLERANCE),
      );
      if (clear && worstOverlap(points, w) <= OVERLAP_TOLERANCE) return layout;
    }
  }
  return row(width, height, n);
};
