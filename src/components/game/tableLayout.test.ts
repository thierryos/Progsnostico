import { describe, expect, it } from 'vitest';
import { CARD_RATIO } from '../PlayingCard';
import { LABEL_H, OVERLAP_TOLERANCE as TOLERANCE, layoutTable } from './tableLayout';

/** Tamanhos reais medidos da área da mesa (px CSS) em vários aparelhos. */
const TABLES = {
  'celular 360×640': [344, 330],
  'celular 390×844': [374, 467],
  'celular deitado 844×390': [828, 170],
  'tablet 768×1024': [752, 640],
  'desktop 1280×800': [970, 390],
} as const;

describe('layout da mesa', () => {
  for (const [device, [w, h]] of Object.entries(TABLES)) {
    for (let n = 2; n <= 7; n++) {
      it(`${device} com ${n} jogadores: cartas dentro da mesa e sem se cobrir`, () => {
        const layout = layoutTable(w, h, n);
        const bw = layout.cardW;
        const bh = layout.cardW * CARD_RATIO + LABEL_H;
        const boxes = Array.from({ length: n }, (_, i) => layout.position(i, i));

        for (const { x, y } of boxes) {
          expect(x - bw / 2).toBeGreaterThanOrEqual(-1);
          expect(x + bw / 2).toBeLessThanOrEqual(w + 1);
          expect(y - bh / 2).toBeGreaterThanOrEqual(-1);
          expect(y + bh / 2).toBeLessThanOrEqual(h + 1);
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

  it('usa fileira em mesas baixas', () => {
    expect(layoutTable(828, 170, 4).mode).toBe('row');
    expect(layoutTable(374, 467, 4).mode).toBe('ring');
  });
});
