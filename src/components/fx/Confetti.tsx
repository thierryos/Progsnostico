import { useMemo } from 'react';

const COLORS = ['#eab308', '#fe3e3e', '#009dff', '#22c55e', '#ffffff', '#ff9f00'];
const PIECES = 36;

/** Confete de "pixels" caindo (fim de jogo). Posições fixas por montagem, sem JS por quadro. */
export const Confetti = () => {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: (i * 97) % 100,
        delay: ((i * 37) % 100) / 60,
        size: 6 + ((i * 13) % 3) * 3,
        color: COLORS[i % COLORS.length],
        duration: 2.4 + ((i * 29) % 10) / 10,
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            animationIterationCount: 2,
          }}
        />
      ))}
    </div>
  );
};
