import { useEffect, useRef } from 'react';

/**
 * Atalhos de teclado (PC). O tratador recebe `event.key` e retorna `true` quando usou a tecla.
 * Ignora campos de texto, teclas com modificadores e repetição, e Enter/Espaço sobre um botão
 * focado (o navegador já clica nele: a ação não pode acontecer duas vezes).
 */
export const useKeyboard = (handler: (key: string) => boolean, enabled = true) => {
  const ref = useRef(handler);

  useEffect(() => {
    ref.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.key === 'Enter' || e.key === ' ') && target?.closest('button, a, [role="button"]')) {
        return;
      }
      if (ref.current(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
};
