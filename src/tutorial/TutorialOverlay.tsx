import { ArrowRight, Check, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { Button } from '../components/ui/Button';
import type { TutorialStep } from './script';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;

/** Acompanha a posição do elemento alvo (ele pode se mover com animações e rotação da tela). */
const useTargetRect = (targetId?: string) => {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!targetId) {
      setRect(null);
      return;
    }
    const measure = () => {
      const visible = (el: HTMLElement | null) =>
        el && el.getBoundingClientRect().width > 0 ? el : null;
      const el =
        visible(document.getElementById(targetId)) ??
        visible(document.getElementById(`${targetId}-fallback`));
      const r = el?.getBoundingClientRect();
      const next =
        r && r.width > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      setRect((prev) =>
        prev &&
        next &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };
    measure();
    const timer = window.setInterval(measure, 150);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
    };
  }, [targetId]);

  return rect;
};

interface TutorialOverlayProps {
  step: TutorialStep;
  index: number;
  total: number;
  onNext: () => void;
  onExit: () => void;
}

/**
 * Holofote: escurece e bloqueia a tela inteira, exceto o elemento alvo.
 * O alvo só recebe toques quando o passo exige uma ação do jogador.
 */
export const TutorialOverlay = ({ step, index, total, onNext, onExit }: TutorialOverlayProps) => {
  const { t } = useI18n();
  const rect = useTargetRect(step.target);
  const hole = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const dim = 'fixed z-[60] bg-black/65';
  const panelAtTop = hole ? hole.top + hole.height / 2 > window.innerHeight / 2 : false;

  return (
    <>
      {hole ? (
        <>
          <div
            className={dim}
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }}
          />
          <div
            className={dim}
            style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className={dim}
            style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }}
          />
          <div
            className={dim}
            style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }}
          />
          <div
            className={`fixed z-[60] rounded-2xl ring-4 ring-balatro-gold shadow-[0_0_40px_rgb(234_179_8/0.6)] ${step.wait ? 'pointer-events-none animate-pulse' : ''}`}
            style={hole}
          />
        </>
      ) : (
        <div className={`${dim} inset-0`} />
      )}

      <div
        className={[
          'fixed inset-x-0 z-[65] flex justify-center px-3',
          !hole
            ? 'top-1/2 -translate-y-1/2'
            : panelAtTop
              ? 'top-[max(0.75rem,env(safe-area-inset-top))]'
              : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))]',
        ].join(' ')}
      >
        <div
          key={index}
          className="w-full max-w-lg rounded-2xl border-4 border-balatro-gold bg-balatro-panel p-4 shadow-[0_0_50px_rgb(0_0_0/0.8)] animate-in fade-in zoom-in-95"
        >
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-700 pb-2">
            <span className="text-base tracking-widest text-balatro-gold uppercase">
              {t('tutorialStep', { n: index + 1, total })}
            </span>
            <button
              type="button"
              onClick={onExit}
              className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-base text-red-300 hover:bg-red-950"
            >
              <LogOut size={16} /> {t('exitTutorial')}
            </button>
          </div>
          <p className="mb-3 text-xl leading-snug text-white">{t(step.text)}</p>
          {step.wait ? (
            <p className="animate-pulse text-right text-lg text-yellow-400 uppercase">
              {t('yourTurn')}…
            </p>
          ) : step.final ? (
            <Button variant="success" block icon={<Check size={20} />} onClick={onExit}>
              {t('endTutorial')}
            </Button>
          ) : (
            <div className="flex justify-end">
              <Button variant="primary" onClick={onNext}>
                {t('next')} <ArrowRight size={20} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
