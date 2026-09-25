import { useEffect, useRef } from 'react';

/**
 * Botão "voltar" (do navegador ou do Android). Componentes registram um tratador;
 * o mais recente roda primeiro. Retornar `true` significa "tratei aqui, não navegue"
 * (ex.: fechar um modal, pedir confirmação para sair da partida).
 */
type BackHandler = () => boolean;

const handlers: { current: BackHandler }[] = [];

export const runBackHandlers = () => {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i].current()) return true;
  }
  return false;
};

export const useBackHandler = (handler: BackHandler, enabled = true) => {
  const ref = useRef(handler);

  useEffect(() => {
    ref.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const entry = { current: () => ref.current() };
    handlers.push(entry);
    return () => {
      const index = handlers.indexOf(entry);
      if (index >= 0) handlers.splice(index, 1);
    };
  }, [enabled]);
};
