import type { CSSProperties } from 'react';

const SPARKS = 12;
const COLORS = ['#fde68a', '#eab308', '#ffffff', '#fbbf24'];

/**
 * Explosão de faíscas + "+1" subindo, centralizada no elemento pai (carta vencedora).
 * Roda uma vez ao montar; só CSS.
 */
export const WinBurst = ({ label = '+1', radius = 70 }: { label?: string; radius?: number }) => (
  <span aria-hidden className="pointer-events-none absolute inset-0 z-30">
    {Array.from({ length: SPARKS }, (_, i) => {
      const angle = (i / SPARKS) * Math.PI * 2 + (i % 2) * 0.2;
      const distance = radius * (i % 3 === 0 ? 1 : 0.72);
      const size = i % 3 === 0 ? 8 : 5;
      return (
        <span
          key={i}
          className="absolute top-1/2 left-1/2 animate-sparkle rounded-[1px]"
          style={
            {
              width: size,
              height: size,
              background: COLORS[i % COLORS.length],
              boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}`,
              animationDelay: `${(i % 4) * 40}ms`,
              '--dx': `${Math.cos(angle) * distance}px`,
              '--dy': `${Math.sin(angle) * distance}px`,
            } as CSSProperties
          }
        />
      );
    })}
    <span className="absolute -top-2 left-1/2 animate-float-up font-display text-3xl text-balatro-gold [text-shadow:0_2px_0_#7c2d12,0_0_12px_rgb(234_179_8/0.8)]">
      {label}
    </span>
  </span>
);
