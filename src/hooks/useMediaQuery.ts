import { useSyncExternalStore } from 'react';

/** Mesma condição da variante `short:` do Tailwind (src/index.css): celular deitado. */
export const SHORT_SCREEN = '(max-height: 520px)';

/** Acompanha uma media query CSS (muda ao girar a tela ou redimensionar a janela). */
export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
