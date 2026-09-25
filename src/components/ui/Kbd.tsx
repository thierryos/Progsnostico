import type { ReactNode } from 'react';

/** Tecla de atalho ao lado de um botão: só aparece em aparelhos com mouse (PC). */
export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="hidden rounded-md border border-current/50 px-1.5 font-pixel text-base leading-tight font-normal tracking-normal normal-case opacity-80 pointer-fine:inline-block">
    {children}
  </kbd>
);
