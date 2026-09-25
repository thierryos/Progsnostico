import { describe, expect, it } from 'vitest';
import { OVERLAP_TOLERANCE as TOLERANCE, blockHeight, planTable, type Rect } from './tableLayout';

/** Tamanhos reais medidos da área da mesa (px CSS) em vários aparelhos. */
const TABLES = {
  'celular 360×640': [344, 330],
  'celular 360×640 no palpite': [344, 250],
  'celular 390×844': [374, 467],
  'celular deitado 844×390': [828, 170],
  'tablet 768×1024': [752, 640],
  'desktop 1280×800': [970, 390],
  'notebook 1366×768': [1062, 420],
  'PC 1920×960': [1520, 560],
} as const;

const overlap = (x: number, y: number, bw: number, bh: number, r: Rect) =>
  Math.min(
    Math.min(x + bw / 2, r.x + r.w) - Math.max(x - bw / 2, r.x),
    Math.min(y + bh / 2, r.y + r.h) - Math.max(y - bh / 2, r.y),
  );

describe('layout da mesa', () => {
  for (const [device, [w, h]] of Object.entries(TABLES)) {
    const short = device.includes('deitado');
    for (let n = 2; n <= 7; n++) {
      it(`${device} com ${n} jogadores: cartas dentro da mesa, sem se cobrir nem cobrir os selos`, () => {
        const { layout, leadChip, trump } = planTable(w, h, n, { trump: !short });
        const bw = layout.cardW;
        const bh = blockHeight(bw);
        const boxes = Array.from({ length: n }, (_, i) => layout.position(i, i));
        const reserved = trump ? [leadChip, trump.rect] : [leadChip];

        for (const r of reserved) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.y).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(w);
          expect(r.y + r.h).toBeLessThanOrEqual(h);
        }
        for (const { x, y } of boxes) {
          expect(x - bw / 2).toBeGreaterThanOrEqual(-1);
          expect(x + bw / 2).toBeLessThanOrEqual(w + 1);
          expect(y - bh / 2).toBeGreaterThanOrEqual(-1);
          expect(y + bh / 2).toBeLessThanOrEqual(h + 1);
          for (const r of reserved) {
            expect(overlap(x, y, bw, bh, r), 'carta sobre um selo').toBeLessThanOrEqual(TOLERANCE);
          }
        }
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const overlapX = bw - Math.abs(boxes[i].x - boxes[j].x);
            const overlapY = bh - Math.abs(boxes[i].y - boxes[j].y);
            expect(Math.min(overlapX, overlapY), `assentos ${i} e ${j}`).toBeLessThanOrEqual(
              TOLERANCE,
            );
          }
        }
      });
    }
  }

  it('usa fileira em mesas baixas e anel no celular em pé (mesmo com o trunfo na mesa)', () => {
    expect(planTable(828, 170, 4, { trump: false }).layout.mode).toBe('row');
    for (let n = 2; n <= 7; n++) {
      const plan = planTable(374, 467, n);
      expect(plan.layout.mode).toBe('ring');
      expect(plan.trump).not.toBeNull();
    }
  });

  it('mostra o trunfo na mesa (e grande) em tablet, notebook e PC', () => {
    for (const device of ['tablet 768×1024', 'notebook 1366×768', 'PC 1920×960'] as const) {
      const [w, h] = TABLES[device];
      for (let n = 2; n <= 7; n++) {
        const { trump } = planTable(w, h, n);
        expect(trump, `${device} com ${n}`).not.toBeNull();
        expect(trump!.cardW, `${device} com ${n}`).toBeGreaterThanOrEqual(70);
      }
    }
  });

  it('no palpite, mesa baixa e estreita: trunfo no meio da fileira vazia', () => {
    const playing = planTable(344, 172, 7);
    const bidding = planTable(344, 172, 7, { bidding: true });
    expect(playing.trump).toBeNull();
    expect(bidding.layout.mode).toBe('row');
    expect(bidding.trump?.placement).toBe('center');
    const { rect } = bidding.trump!;
    expect(rect.x + rect.w / 2).toBeCloseTo(172);
    expect(rect.y + rect.h).toBeLessThanOrEqual(172);
  });

  it('mesa baixa e cheia: fileira com o trunfo na lateral em vez de escondê-lo', () => {
    const plan = planTable(1062, 300, 7);
    expect(plan.layout.mode).toBe('row');
    expect(plan.trump?.placement).toBe('side');
    expect(plan.trump!.rect.y).toBeGreaterThan(10);
  });
});
