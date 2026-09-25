import { CARD_RATIO } from '../PlayingCard';

/** Sobreposição tolerada entre blocos vizinhos (as cartas ficam levemente inclinadas). */
export const OVERLAP_TOLERANCE = 10;
/** A carta vencedora da vaza cresce um pouco; o layout reserva espaço para isso. */
export const WINNER_SCALE = 1.06;
const GAP = 6;
const PAD = 10;
const MIN_W = 36;
const MAX_W = 128;
/** Altura do painel do trunfo na escala 1 (carta de 56px + texto). */
const TRUMP_BASE_H = 86;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

type Point = { x: number; y: number };

/** Retângulo reservado na mesa (canto superior esquerdo `x,y`). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fonte (px) do nome embaixo da carta: acompanha o tamanho da carta. */
export const labelFont = (cardW: number) => clamp(cardW * 0.15, 13, 19);

/** Altura do rótulo com o nome embaixo da carta (inclui a margem). */
export const labelHeight = (cardW: number) => Math.ceil(labelFont(cardW) * 1.25) + 8;

/** Altura do bloco carta + nome. */
export function blockHeight(cardW: number) {
  return cardW * CARD_RATIO + labelHeight(cardW);
}

/**
 * Escala dos selos da mesa (naipe puxado, trunfo): 1 no celular, cresce em mesas grandes
 * (tablet, PC) para o trunfo não virar um detalhe no canto.
 */
export const tableScale = (width: number, height: number) =>
  clamp(Math.min(width / 520, height / 260), 1, 1.7);

/** Selo "naipe puxado" no canto superior esquerdo. */
export const leadChip = (scale: number): Rect => ({ x: 10, y: 10, w: 128 * scale, h: 50 * scale });

export interface TrumpPanel {
  /** Onde o painel ficou: canto superior direito, lateral direita ou meio da mesa. */
  placement: 'corner' | 'side' | 'center';
  /** Largura da carta do trunfo (px). */
  cardW: number;
  /** Escala do texto ao lado da carta. */
  scale: number;
  rect: Rect;
}

/** Painel horizontal do trunfo (carta + texto) no canto superior direito. */
export const trumpPanel = (width: number, scale: number): TrumpPanel => {
  const cardW = clamp(width / 9, 36, 56) * scale;
  const w = cardW + 100 * scale;
  // Altura suficiente para a carta e para as 4 linhas de texto ao lado.
  const h = Math.max(cardW * CARD_RATIO, 74 * scale) + 12 * scale;
  return { placement: 'corner', cardW, scale, rect: { x: width - w - 10, y: 10, w, h } };
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
  // Frente a frente (você × quem senta em cima) sobra folga para a vencedora crescer e o troféu.
  const spread = n <= 4 ? 0.62 : 1;
  const ry = Math.min(ryMax, Math.max(block / 2 + 3 * GAP, ryMax * spread));
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

/** Maior anel que cabe sem cobrir os retângulos reservados (ou `null`). */
const fitRing = (
  width: number,
  height: number,
  n: number,
  reserved: readonly Rect[],
): TableLayout | null => {
  const seats = Array.from({ length: n }, (_, i) => i);
  // 1ª tentativa: mesa inteira; 2ª: só abaixo da faixa ocupada pelos cantos reservados.
  const band = reserved.reduce((max, r) => Math.max(max, r.y + r.h), 0);

  for (const top of band > 0 ? [0, band] : [0]) {
    const start = clamp(Math.min(width / 5, (height - top) / 3.2), MIN_W, MAX_W);
    for (let w = start; w >= MIN_W; w *= 0.92) {
      // `null` = carta grande demais para esta altura: tenta menor.
      const layout = ring(width, height, n, w, top);
      if (!layout) continue;
      const points = seats.map((s) => layout.position(s, s));
      const clear = points.every((p) =>
        reserved.every((r) => rectOverlap(p, w, r) <= OVERLAP_TOLERANCE),
      );
      if (clear && worstOverlap(points, w) <= OVERLAP_TOLERANCE) return layout;
    }
  }
  return null;
};

/**
 * Fileira na ordem jogada. `side` reserva uma faixa em cada lateral (painel do trunfo, selo);
 * `top` usa só a área abaixo dessa altura (livra a faixa dos cantos).
 */
const row = (width: number, height: number, n: number, side = 0, top = 0): TableLayout => {
  const span = width - 2 * (PAD + side);
  const byHeight = (height - top - labelHeight(MAX_W) - 2 * PAD) / CARD_RATIO / WINNER_SCALE;
  const cardW = clamp(Math.min(byHeight, span / n - GAP), MIN_W, MAX_W);
  const step = n > 1 ? Math.min(cardW + GAP, (span - cardW) / (n - 1)) : 0;
  const start = width / 2 - (step * (n - 1)) / 2;
  const y = top + (height - top) / 2;
  return {
    mode: 'row',
    cardW,
    position: (_seat, order) => ({ x: start + order * step, y }),
  };
};

/** Fileira que só vale se as cartas couberem lado a lado e num tamanho legível. */
const fairRow = (layout: TableLayout, n: number, minW: number) => {
  const points = Array.from({ length: n }, (_, i) => layout.position(i, i));
  return worstOverlap(points, layout.cardW) <= 0 && layout.cardW >= minW ? layout : null;
};

/** Fileira com uma faixa livre em cada lateral, se as cartas ainda couberem bem nela. */
const sideRow = (width: number, height: number, n: number, side: number) =>
  fairRow(row(width, height, n, side), n, Math.min(48, row(width, height, n).cardW * 0.85));

/** Fileira abaixo da faixa dos cantos (mesa estreita e não tão baixa). */
const belowRow = (width: number, height: number, n: number, top: number) =>
  fairRow(row(width, height, n, 0, top), n, 44);

/**
 * O anel mostra quem jogou o quê pelo assento, então ganha da fileira sempre que as cartas
 * dele continuam legíveis: grandes o bastante ou quase do tamanho das da fileira.
 */
const RING_GOOD_W = 72;
const preferRing = (ringLayout: TableLayout | null, rowW: number) =>
  ringLayout && (ringLayout.cardW >= RING_GOOD_W || ringLayout.cardW >= rowW * 0.75)
    ? ringLayout
    : null;

/**
 * Onde cada carta jogada fica na mesa (sem painel do trunfo).
 * - `ring`: no assento de quem jogou (você embaixo, os demais no sentido do jogo).
 *   Diminui as cartas até os assentos vizinhos não se cobrirem nem cobrirem os cantos
 *   reservados (`reserved`).
 * - `row`: quando o anel não cabe ou fica pequeno demais (mesa baixa, celular deitado):
 *   lado a lado, na ordem jogada, deixando livre a faixa dos cantos reservados quando dá.
 */
export const layoutTable = (
  width: number,
  height: number,
  players: number,
  reserved: readonly Rect[] = [],
): TableLayout => {
  const n = Math.max(1, players);
  // Na fileira, os retângulos reservados ficam à esquerda (selo): livra a mesma faixa dos dois
  // lados para as cartas continuarem centralizadas.
  const side = reserved.reduce((max, r) => Math.max(max, r.x + r.w), 0);
  const band = reserved.reduce((max, r) => Math.max(max, r.y + r.h), 0);
  const flat =
    (side > 0 ? sideRow(width, height, n, side - PAD + GAP) : null) ??
    (band > 0 ? belowRow(width, height, n, band) : null) ??
    row(width, height, n);
  return preferRing(fitRing(width, height, n, reserved), flat.cardW) ?? flat;
};

export interface TablePlan {
  layout: TableLayout;
  leadChip: Rect;
  /** Painel do trunfo na mesa; `null` quando não cabe (a barra superior mostra o trunfo). */
  trump: TrumpPanel | null;
}

/**
 * Mesa completa: cartas + selo do naipe puxado + painel do trunfo.
 * 1. Anel com o trunfo no canto superior direito.
 * 2. Mesa baixa: fileira no meio, trunfo na lateral direita (centralizado) e selo na esquerda.
 * 3. Sem espaço nas laterais: fileira abaixo do trunfo no canto, se couber.
 * 4. Senão o trunfo sai da mesa (vai para a barra superior) — exceto no palpite (`bidding`), em
 *    que a fileira ainda está vazia e o trunfo fica no meio dela.
 * `trump: false` (celular deitado) tira o painel: o trunfo vai para a barra superior.
 */
export const planTable = (
  width: number,
  height: number,
  players: number,
  { trump = true, bidding = false } = {},
): TablePlan => {
  const n = Math.max(1, players);
  const scale = tableScale(width, height);
  const chip = leadChip(scale);
  if (!trump) return { layout: layoutTable(width, height, n, [chip]), leadChip: chip, trump: null };

  // No anel o painel ocupa no máximo ~30% da altura da mesa (as cartas jogadas vêm primeiro).
  const cornerScale = Math.max(1, Math.min(scale, (height * 0.3) / TRUMP_BASE_H));
  const corner = trumpPanel(width, cornerScale);
  const ringLayout = fitRing(width, height, n, [chip, corner.rect]);
  const ringPlan = ringLayout && { layout: ringLayout, leadChip: chip, trump: corner };
  if (ringPlan && ringLayout.cardW >= RING_GOOD_W) return ringPlan;

  let rowPlan: TablePlan | null = null;
  const sideScale = Math.min(scale, (height - 2 * PAD) / TRUMP_BASE_H);
  if (sideScale >= 0.9) {
    const side = trumpPanel(width, sideScale);
    const rect = { ...side.rect, y: (height - side.rect.h) / 2 };
    const layout = sideRow(width, height, n, rect.w + GAP);
    if (layout) {
      rowPlan = {
        layout,
        leadChip: leadChip(Math.min(scale, sideScale)),
        trump: { ...side, placement: 'side', rect },
      };
    }
  }
  if (!rowPlan) {
    const layout = belowRow(width, height, n, corner.rect.y + corner.rect.h);
    if (layout) rowPlan = { layout, leadChip: chip, trump: corner };
  }

  if (ringPlan && preferRing(ringLayout, rowPlan?.layout.cardW ?? 0)) return ringPlan;
  if (rowPlan) return rowPlan;

  const layout = layoutTable(width, height, n, [chip]);
  // No palpite a fileira ainda está vazia: o trunfo ocupa o meio da mesa em vez de ir para o topo.
  if (bidding && layout.mode === 'row' && sideScale >= 0.9) {
    const center = trumpPanel(width, sideScale);
    const rect = {
      ...center.rect,
      x: (width - center.rect.w) / 2,
      y: (height - center.rect.h) / 2,
    };
    return { layout, leadChip: chip, trump: { ...center, placement: 'center', rect } };
  }
  return { layout, leadChip: chip, trump: null };
};
