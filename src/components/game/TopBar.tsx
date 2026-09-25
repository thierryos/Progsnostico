import { CircleHelp, History, LogOut, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cardsThisRound } from '../../game/engine';
import type { GameState } from '../../game/types';
import { useI18n } from '../../i18n';
import { getVolume, setVolume } from '../../lib/sound';
import { PlayingCard } from '../PlayingCard';
import { SUIT_TEXT_ON_DARK, SuitIcon } from '../SuitIcon';
import { IconButton } from '../ui/Button';

interface TopBarProps {
  game: GameState;
  /** Mostra o trunfo aqui quando ele não coube na mesa (celular deitado, mesa lotada). */
  showTrump: boolean;
  /** Conteúdo central (oponentes), exibido só em telas baixas. */
  center?: ReactNode;
  onOpenScoreboard: () => void;
  onOpenHistory: () => void;
  onOpenHelp: () => void;
  onExit: () => void;
}

export const TopBar = ({
  game,
  showTrump,
  center,
  onOpenScoreboard,
  onOpenHistory,
  onOpenHelp,
  onExit,
}: TopBarProps) => {
  const { t } = useI18n();
  const cards = cardsThisRound(game);
  const trumpSuit = game.trumpCard?.suit ?? null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-2 short:h-12 sm:gap-3 sm:px-3">
      <div className="flex shrink-0 gap-3">
        <Counter label={t('round')}>
          {game.roundIndex + 1}
          <span className="text-lg text-slate-500">/{game.roundSequence.length}</span>
        </Counter>
        {/* Com o trunfo aqui, em telas estreitas não cabe tudo: a mão já mostra as cartas. */}
        <Counter label={t('cards')} className={showTrump ? 'max-[400px]:hidden' : ''}>
          {cards}
        </Counter>
      </div>

      {showTrump && (
        <div
          id="trump-card-fallback"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-balatro-gold/50 bg-black/40 p-1 pr-2"
        >
          {game.trumpCard ? (
            <PlayingCard card={game.trumpCard} width={28} trump className="animate-pop" />
          ) : (
            <div className="grid h-[39px] w-7 place-items-center rounded border border-dashed border-white/30 text-xs text-white/40">
              ✕
            </div>
          )}
          <div className="flex flex-col leading-none max-[400px]:hidden">
            <span className="text-sm text-balatro-gold uppercase">
              {trumpSuit ? t('trump') : t('noTrump')}
            </span>
            {trumpSuit && (
              <span
                className={`flex items-center gap-0.5 text-base uppercase ${SUIT_TEXT_ON_DARK[trumpSuit]}`}
              >
                <SuitIcon suit={trumpSuit} size={12} />
                {t(`suit_${trumpSuit}`)}
              </span>
            )}
          </div>
        </div>
      )}

      {center && <div className="hidden min-w-0 flex-1 justify-center short:flex">{center}</div>}

      <nav className="ml-auto flex items-center gap-1.5">
        <IconButton label={t('scoreboard')} className="lg:hidden" onClick={onOpenScoreboard}>
          <Trophy size={18} />
        </IconButton>
        {game.trickHistory.length > 0 && (
          <IconButton id="history-btn" label={t('history')} onClick={onOpenHistory}>
            <History size={18} />
          </IconButton>
        )}
        <IconButton id="help-btn" label={t('help')} tone="gold" onClick={onOpenHelp}>
          <CircleHelp size={18} />
        </IconButton>
        <VolumeControl />
        <IconButton label={t('exit')} tone="danger" onClick={onExit}>
          <LogOut size={18} />
        </IconButton>
      </nav>
    </header>
  );
};

const Counter = ({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={`flex flex-col leading-none ${className}`}>
    <span className="text-sm tracking-wider text-slate-400 uppercase">{label}</span>
    <span className="text-2xl text-white">{children}</span>
  </div>
);

const VolumeControl = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [volume, setVolumeState] = useState(getVolume);

  const change = (value: number) => {
    setVolume(value);
    setVolumeState(value);
  };

  return (
    <div className="relative">
      <IconButton label={t('sound')} onClick={() => setOpen((o) => !o)}>
        {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </IconButton>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-12 right-0 z-50 flex w-48 items-center gap-2 rounded-xl border-2 border-slate-600 bg-slate-900 p-3 shadow-xl animate-in fade-in slide-in-from-top-2">
            <button
              type="button"
              aria-label={t('sound')}
              className="text-balatro-gold"
              onClick={() => change(volume === 0 ? 0.5 : 0)}
            >
              {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              aria-label={t('volume')}
              onChange={(e) => change(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-balatro-gold"
            />
          </div>
        </>
      )}
    </div>
  );
};
