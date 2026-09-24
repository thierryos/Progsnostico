import { CircleHelp, History, LogOut, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cardsThisRound } from '../../game/engine';
import type { GameState } from '../../game/types';
import { useI18n } from '../../i18n';
import { getVolume, setVolume } from '../../lib/sound';
import { PlayingCard } from '../PlayingCard';
import { IconButton } from '../ui/Button';

interface TopBarProps {
  game: GameState;
  /** Conteúdo central (oponentes), exibido só em telas baixas. */
  center?: ReactNode;
  onOpenScoreboard: () => void;
  onOpenHistory: () => void;
  onOpenHelp: () => void;
  onExit: () => void;
}

export const TopBar = ({
  game,
  center,
  onOpenScoreboard,
  onOpenHistory,
  onOpenHelp,
  onExit,
}: TopBarProps) => {
  const { t } = useI18n();
  const cards = cardsThisRound(game);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-2 short:h-12 sm:gap-3 sm:px-3">
      <div className="flex shrink-0 flex-col leading-none">
        <span className="text-sm tracking-wider text-slate-400 uppercase">{t('round')}</span>
        <span className="text-2xl text-white">
          {game.roundIndex + 1}
          <span className="text-lg text-slate-500">/{game.roundSequence.length}</span>
        </span>
      </div>

      <div
        id="trump-card"
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-black/40 p-1 pr-2"
      >
        {game.trumpCard ? (
          <PlayingCard card={game.trumpCard} width={28} className="animate-pop" />
        ) : (
          <div className="grid h-[39px] w-7 place-items-center rounded border border-dashed border-white/30 text-xs text-white/40">
            ✕
          </div>
        )}
        <div className="flex flex-col leading-none">
          <span className="text-sm text-balatro-gold uppercase">
            {game.trumpCard ? t('trump') : t('noTrump')}
          </span>
          <span className="text-sm text-slate-400">
            {cards === 1 ? t('cardsOne') : t('cardsMany', { n: cards })}
          </span>
        </div>
      </div>

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
