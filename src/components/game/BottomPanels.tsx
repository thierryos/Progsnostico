import { Flag, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { cardsThisRound } from '../../game/engine';
import { BID_STATUS_COLOR, bidStatus, bidsSum } from '../../game/selectors';
import type { GameState, Player } from '../../game/types';
import { useI18n } from '../../i18n';
import { SUIT_TEXT_ON_DARK, SuitIcon } from '../SuitIcon';
import { Button } from '../ui/Button';

const Stat = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string | number;
  className?: string;
}) => (
  <div className="flex flex-col items-center leading-none">
    <span className="text-xs tracking-wider text-slate-400 uppercase">{label}</span>
    <span key={value} className={`inline-block animate-pop text-2xl ${className}`}>
      {value}
    </span>
  </div>
);

interface PlayerBarProps {
  game: GameState;
  me: Player;
  hint: 'tapAgain' | null;
}

/** Sua linha de status: nome, pontos, palpite/feitas e de quem é a vez. */
export const PlayerBar = ({ game, me, hint }: PlayerBarProps) => {
  const { t } = useI18n();
  const myTurn = game.currentTurn === me.id;
  const turnPlayer = game.players.find((p) => p.id === game.currentTurn);
  const mustFollow =
    myTurn && game.leadSuit && me.hand.some((c) => c.suit === game.leadSuit) ? game.leadSuit : null;
  const leading = myTurn && game.phase === 'playing' && game.tableCards.length === 0;

  let status: ReactNode = null;
  if (hint === 'tapAgain') {
    status = <span className="text-balatro-gold">{t('tapAgain')}</span>;
  } else if (myTurn) {
    status = (
      <span className="flex flex-col items-center leading-tight">
        <span className="animate-glow-pulse rounded-full bg-balatro-gold px-3 text-xl text-black">
          {leading ? (
            <span className="flex items-center gap-1">
              <Flag size={14} fill="currentColor" /> {t('youStart')}
            </span>
          ) : (
            t('yourTurn')
          )}
        </span>
        {mustFollow && (
          <span className={`flex items-center gap-1 text-sm ${SUIT_TEXT_ON_DARK[mustFollow]}`}>
            <SuitIcon suit={mustFollow} size={12} />
            {t('mustFollow', { suit: t(`suit_${mustFollow}`) })}
          </span>
        )}
      </span>
    );
  } else if (turnPlayer) {
    status = (
      <span className="text-slate-300">
        {game.phase === 'bidding'
          ? t('waitingBid', { name: turnPlayer.name })
          : t('turnOf', { name: turnPlayer.name })}
      </span>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl shrink-0 items-center gap-2 px-3 pb-1">
      <div className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-xl text-white short:text-lg">{me.name}</span>
        <span className="text-lg text-balatro-blue">
          {me.score} {t('points')}
        </span>
      </div>
      <div className="min-w-0 flex-1 truncate text-center text-lg">{status}</div>
      <div className="flex shrink-0 gap-3 rounded-xl border-2 border-slate-700 bg-slate-900/90 px-3 py-1 short:py-0">
        <Stat label={t('bid')} value={me.currentBid ?? '–'} className="text-balatro-blue" />
        <Stat label={t('won')} value={me.tricksWon} className={BID_STATUS_COLOR[bidStatus(me)]} />
      </div>
    </div>
  );
};

interface BidPanelProps {
  game: GameState;
  me: Player;
  onBid: (amount: number) => void;
}

/** Palpite: fica acima da mão (nunca a cobre), para você decidir olhando as cartas. */
export const BidPanel = ({ game, me, onBid }: BidPanelProps) => {
  const { t } = useI18n();
  const options = Array.from({ length: me.hand.length + 1 }, (_, i) => i);

  return (
    <div className="mx-auto w-full max-w-2xl shrink-0 px-2 pb-1">
      <div className="rounded-2xl border-2 border-balatro-gold bg-slate-900/95 p-2.5 shadow-[0_0_30px_rgb(0_0_0/0.6),0_0_22px_rgb(234_179_8/0.18)] animate-in slide-in-from-bottom-4 fade-in short:flex short:items-center short:gap-3 short:p-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="text-2xl text-balatro-gold uppercase short:text-lg">{t('bidPrompt')}</h2>
          <span className="text-base text-slate-400">
            {t('bidsSoFar', { sum: bidsSum(game), cards: cardsThisRound(game) })}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2 short:mt-0 short:gap-1.5">
          {options.map((n) => (
            <button
              key={n}
              id={`bid-btn-${n}`}
              type="button"
              onClick={() => onBid(n)}
              className="grid size-12 place-items-center rounded-xl border-2 border-slate-600 border-b-4 bg-slate-800 text-3xl short:size-10 short:text-2xl text-white transition-colors hover:border-white hover:bg-balatro-blue active:translate-y-0.5"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface TrickSummaryPanelProps {
  game: GameState;
  me: Player;
  onReady: () => void;
}

/** Resultado do duelo: a mesa continua visível com a carta vencedora destacada. */
export const TrickSummaryPanel = ({ game, me, onReady }: TrickSummaryPanelProps) => {
  const { t } = useI18n();
  const winner = game.players.find((p) => p.id === game.trickResult?.winnerId);
  const pending = game.players.filter((p) => !p.isReady).length;

  return (
    <div id="trick-summary" className="mx-auto w-full max-w-2xl shrink-0 px-2 pb-1">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-balatro-gold bg-slate-900/95 p-2.5 shadow-[0_0_22px_rgb(234_179_8/0.18)] animate-in slide-in-from-bottom-4 fade-in short:p-1.5">
        <Trophy className="shrink-0 text-balatro-gold short:hidden" size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm tracking-widest text-slate-400 uppercase">{t('trickWinner')}</div>
          <div className="truncate text-2xl text-white">{winner?.name ?? '?'}</div>
        </div>
        <Button
          variant="success"
          size="md"
          disabled={me.isReady}
          onClick={onReady}
          className="shrink-0 short:min-h-10 short:text-lg"
        >
          {me.isReady ? t('waitingOthers', { n: pending }) : t('readyNext')}
        </Button>
      </div>
    </div>
  );
};
