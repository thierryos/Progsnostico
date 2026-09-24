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

/** Preferências visuais (pós-processamento), salvas no aparelho. */
export interface VisualSettings {
  /** Camada de tela antiga: scanlines, granulado, vinheta, aberração cromática. */
  crt: boolean;
  /** Fundo animado (shader) nos menus. */
  motion: boolean;
}

const KEY = 'prog.fx';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const load = (): VisualSettings => {
  const defaults: VisualSettings = { crt: true, motion: !prefersReducedMotion() };
  try {
    const saved = JSON.parse(storage.get(KEY) ?? 'null') as Partial<VisualSettings> | null;
    return { ...defaults, ...saved };
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

  // O CSS usa este atributo para ligar a aberração cromática dos títulos.
  useEffect(() => {
    document.documentElement.dataset.crt = settings.crt ? 'on' : 'off';
  }, [settings.crt]);

  const value = useMemo(() => ({ ...settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings precisa estar dentro de <SettingsProvider>');
  return ctx;
};
