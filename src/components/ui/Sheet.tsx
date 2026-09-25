import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useBackHandler } from '../../lib/back';

interface SheetProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** `tall` ocupa quase a tela toda (manual, histórico). */
  size?: 'auto' | 'tall';
  id?: string;
  closeLabel?: string;
}

/**
 * Modal responsivo: no celular é um "bottom sheet" colado na base da tela
 * (fácil de alcançar com o polegar); a partir de `sm` vira um diálogo centralizado.
 */
export const Sheet = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'auto',
  id,
  closeLabel = 'Fechar',
}: SheetProps) => {
  // Botão voltar (Android/navegador) fecha o modal em vez de sair da tela.
  useBackHandler(
    () => {
      onClose?.();
      return true;
    },
    open && Boolean(onClose),
  );

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        id={id}
        role="dialog"
        aria-modal="true"
        className={[
          'relative flex w-full flex-col overflow-hidden border-slate-600 bg-balatro-panel shadow-2xl',
          'rounded-t-3xl border-x-2 border-t-2 pb-[env(safe-area-inset-bottom)]',
          'animate-in slide-in-from-bottom duration-300',
          'sm:max-w-2xl sm:rounded-3xl sm:border-2 sm:pb-0 sm:zoom-in-95 sm:slide-in-from-bottom-0',
          size === 'tall' ? 'h-[92dvh] sm:h-[85dvh]' : 'max-h-[92dvh] sm:max-h-[85dvh]',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Faixa de marca (a mesma do painel do menu). */}
        <div className="h-1.5 shrink-0 bg-gradient-to-r from-balatro-red via-balatro-blue to-balatro-gold" />
        {(title || onClose) && (
          <header className="flex shrink-0 items-center gap-3 border-b-2 border-slate-800 bg-slate-950/60 px-4 py-3">
            <div className="crt-text min-w-0 flex-1 text-2xl text-balatro-gold uppercase">
              {title}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="grid size-10 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X size={26} />
              </button>
            )}
          </header>
        )}
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer && (
          <footer className="shrink-0 border-t-2 border-slate-800 bg-slate-950/60 p-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
