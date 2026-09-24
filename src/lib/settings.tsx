import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storage } from './storage';

/**
 * Pós-processamento de tela:
 * - `off`: nenhum efeito;
 * - `soft`: vinheta, granulado de filme, luz quente e brilho nos destaques (padrão);
 * - `retro`: tudo do `soft` + linhas de TV antiga e aberração cromática nos títulos.
 */
export type ScreenFx = 'off' | 'soft' | 'retro';

/** Preferências visuais, salvas no aparelho. */
export interface VisualSettings {
  screenFx: ScreenFx;
  /** Fundo animado (shader) nos menus. */
  motion: boolean;
}

const KEY = 'prog.fx';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const load = (): VisualSettings => {
  const defaults: VisualSettings = { screenFx: 'soft', motion: !prefersReducedMotion() };
  try {
    const saved = JSON.parse(storage.get(KEY) ?? 'null') as
      (Partial<VisualSettings> & { crt?: boolean }) | null;
    if (!saved) return defaults;
    // Versão 1.1 guardava `crt: boolean`: quem desligou continua sem efeitos.
    const screenFx =
      saved.screenFx === 'off' || saved.screenFx === 'soft' || saved.screenFx === 'retro'
        ? saved.screenFx
        : saved.crt === false
          ? 'off'
          : 'soft';
    return { screenFx, motion: saved.motion ?? defaults.motion };
  } catch {
    return defaults;
  }
};

interface SettingsValue extends VisualSettings {
  update: (patch: Partial<VisualSettings>) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState(load);

  const update = useCallback((patch: Partial<VisualSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storage.set(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // O CSS usa este atributo para os brilhos/aberração dos títulos (`.crt-text`).
  useEffect(() => {
    document.documentElement.dataset.fx = settings.screenFx;
  }, [settings.screenFx]);

  const value = useMemo(() => ({ ...settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings precisa estar dentro de <SettingsProvider>');
  return ctx;
};
