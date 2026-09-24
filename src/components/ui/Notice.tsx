import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type Notify = (text: string) => void;

const NoticeContext = createContext<Notify>(() => {});

/** Avisos curtos no topo da tela (substitui `alert()`, que trava a interface). */
export const NoticeProvider = ({ children }: { children: ReactNode }) => {
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);

  const notify = useCallback<Notify>((text) => setNotice({ id: Date.now(), text }), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <NoticeContext.Provider value={notify}>
      {children}
      {notice && (
        <div
          key={notice.id}
          role="status"
          className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex justify-center px-4"
        >
          <div className="max-w-md rounded-xl border-2 border-balatro-gold bg-slate-950/95 px-4 py-2 text-center text-xl text-white shadow-2xl animate-in fade-in slide-in-from-top-4">
            {notice.text}
          </div>
        </div>
      )}
    </NoticeContext.Provider>
  );
};

export const useNotice = () => useContext(NoticeContext);
