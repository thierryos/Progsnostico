/**
 * Pós-processamento de "tela de fliperama" por cima de tudo: scanlines, granulado,
 * vinheta com cantos de tubo e reflexo do vidro. Só CSS, sem capturar toques.
 */
export const CrtOverlay = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
    <div className="crt-scanlines absolute inset-0 opacity-40" />
    <div className="crt-grain absolute -inset-[10%] animate-grain opacity-[0.07] mix-blend-overlay" />
    <div className="absolute inset-0 rounded-[22px] shadow-[inset_0_0_90px_rgb(0_0_0/0.55),inset_0_0_0_2px_rgb(0_0_0/0.6)]" />
    <div className="absolute inset-0 bg-[linear-gradient(160deg,rgb(255_255_255/0.05)_0%,transparent_35%)]" />
  </div>
);
