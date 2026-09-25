import type { ScreenFx as ScreenFxMode } from '../../lib/settings';

/**
 * Pós-processamento por cima de tudo (z-80, sem capturar toques), só com CSS:
 * - Suave: vinheta, granulado fino de filme e luz quente vindo de cima.
 * - Retrô: o mesmo + linhas de TV com perfil suave e cantos de tubo.
 * Nada aqui usa filtros de tela cheia (caros no celular); o granulado anima só com transform.
 */
export const ScreenFx = ({ mode }: { mode: ScreenFxMode }) => {
  if (mode === 'off') return null;
  const retro = mode === 'retro';

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {/* Luz quente de "lâmpada de mesa" vinda de cima. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgb(255_214_150/0.10),transparent_70%)]" />
      {/* Vinheta suave nas bordas. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_45%,transparent_58%,rgb(0_0_0/0.42)_100%)]" />
      {/* Granulado de filme: fino, quase imperceptível parado, dá "vida" em movimento. */}
      <div className="crt-grain absolute -inset-[10%] animate-grain opacity-[0.05] mix-blend-overlay" />
      {retro && (
        <>
          <div className="crt-scanlines absolute inset-0 opacity-70" />
          <div className="absolute inset-0 rounded-[22px] shadow-[inset_0_0_80px_rgb(0_0_0/0.5),inset_0_0_0_2px_rgb(0_0_0/0.6)]" />
        </>
      )}
    </div>
  );
};
