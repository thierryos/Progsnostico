import { Bot, WifiOff } from 'lucide-react';
import { BID_STATUS_COLOR, bidStatus } from '../../game/selectors';
import type { GameState } from '../../game/types';
import { useI18n } from '../../i18n';

const STATUS_KEY = { onSpot: 'onSpot', busted: 'busted', seeking: 'seeking' } as const;

/** Placar da rodada atual: usado na barra lateral (desktop) e no painel do celular. */
export const Scoreboard = ({ game, localId }: { game: GameState; localId: string }) => {
  const { t } = useI18n();
  const phaseLabel =
    game.phase === 'bidding'
      ? t('phaseBidding')
      : game.phase === 'trick_summary' || game.phase === 'round_end'
        ? t('phaseSummary')
        : t('phasePlaying');

  return (
    <div id="scoreboard" className="flex flex-col gap-3 p-3">
      <div className="rounded-xl border-2 border-slate-700 bg-slate-900/60 p-3 text-center">
        <div className="text-lg tracking-widest text-slate-400 uppercase">
          {t('roundOf', { n: game.roundIndex + 1, total: game.roundSequence.length })}
        </div>
        <div className="text-2xl text-white uppercase">{phaseLabel}</div>
      </div>

      <ul className="flex flex-col gap-2">
        {game.players.map((p) => {
          const status = bidStatus(p);
          const isTurn = game.currentTurn === p.id;
          return (
            <li
              key={p.id}
              className={[
                'rounded-xl border-2 p-2.5 transition-colors',
                p.id === localId
                  ? 'border-balatro-blue bg-slate-800'
                  : 'border-slate-700 bg-slate-900',
                isTurn ? 'border-l-8 border-l-balatro-gold' : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1">
                <span className="flex min-w-0 items-center gap-1 text-xl">
                  {p.isBot && <Bot size={16} className="shrink-0 text-slate-400" />}
                  {p.isAway && <WifiOff size={16} className="shrink-0 text-red-400" />}
                  <span
                    className={`truncate ${p.id === localId ? 'text-white' : 'text-slate-300'}`}
                  >
                    {p.name}
                  </span>
                </span>
                <span className="text-2xl text-balatro-blue">{p.score}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-lg">
                <span className="text-slate-400">
                  {t('bid')} <span className="text-white">{p.currentBid ?? '–'}</span>
                </span>
                <span className="text-slate-400">
                  {t('won')} <span className={BID_STATUS_COLOR[status]}>{p.tricksWon}</span>
                </span>
              </div>
              {status !== 'none' && (
                <div className={`text-center text-sm uppercase ${BID_STATUS_COLOR[status]}`}>
                  {t(STATUS_KEY[status])}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
