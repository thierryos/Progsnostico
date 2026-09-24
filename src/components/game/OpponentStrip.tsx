import { Check, Flag, WifiOff } from 'lucide-react';
import { BID_STATUS_COLOR, bidStatus, seatOrder } from '../../game/selectors';
import type { GameState, Player } from '../../game/types';
import { useI18n } from '../../i18n';
import { PlayerAvatar } from '../PlayerAvatar';

/** Oponentes na ordem em que jogam depois de você (esquerda → direita). */
export const OpponentStrip = ({
  game,
  localId,
  inline = false,
}: {
  game: GameState;
  localId: string;
  /** Versão de uma linha só, dentro da barra superior (telas baixas). */
  inline?: boolean;
}) => {
  const opponents = seatOrder(game.players, localId).slice(1);

  return (
    <div
      className={
        inline
          ? 'no-scrollbar flex min-w-0 gap-1 overflow-x-auto'
          : 'flex shrink-0 flex-wrap justify-center gap-1.5 px-2 pb-1.5 short:hidden'
      }
    >
      {opponents.map((p) => (
        <OpponentChip key={p.id} player={p} game={game} />
      ))}
    </div>
  );
};

const OpponentChip = ({ player, game }: { player: Player; game: GameState }) => {
  const { t } = useI18n();
  const isTurn = game.currentTurn === player.id;
  const isLeader =
    game.currentTrickLeader === player.id &&
    game.phase === 'playing' &&
    game.tableCards.length === 0;
  const showReady =
    (game.phase === 'trick_summary' || game.phase === 'round_end') && player.isReady;

  return (
    <div
      className={[
        'relative flex w-[4.5rem] flex-col items-center rounded-xl border-2 px-1 pt-1 pb-0.5 transition-colors sm:w-24',
        isTurn
          ? 'border-balatro-gold bg-slate-800 shadow-[0_0_14px_rgb(234_179_8/0.45)]'
          : 'border-slate-700 bg-slate-900/85',
        player.isAway ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="relative short:hidden">
        <PlayerAvatar
          player={player}
          size={32}
          className={isTurn ? 'outline-2 outline-offset-1 outline-balatro-gold' : ''}
        />
        {isLeader && (
          <span className="absolute -top-1 -right-2 rounded-full border border-white bg-balatro-red p-0.5 text-white">
            <Flag size={10} fill="currentColor" />
          </span>
        )}
        {showReady && (
          <span className="absolute -right-2 -bottom-1 rounded-full border border-white bg-green-500 p-0.5 text-black">
            <Check size={10} strokeWidth={4} />
          </span>
        )}
      </div>

      <span className="w-full truncate text-center text-base leading-tight">
        {player.isAway && <WifiOff size={12} className="mr-0.5 inline text-red-400" />}
        {player.name}
      </span>

      <div className="flex w-full items-center justify-between px-0.5 text-sm leading-none">
        <span title={`${t('bid')} / ${t('won')}`}>
          <span className="text-slate-400">{player.currentBid ?? '–'}</span>
          <span className="text-slate-600">/</span>
          <span
            key={player.tricksWon}
            className={`inline-block animate-pop ${BID_STATUS_COLOR[bidStatus(player)]}`}
          >
            {player.tricksWon}
          </span>
        </span>
        <span
          className="flex items-center gap-0.5 text-slate-400"
          title={t('cardsMany', { n: player.hand.length })}
        >
          <span className="inline-block h-3 w-2 rounded-[2px] border border-white/70 bg-balatro-red" />
          {player.hand.length}
        </span>
      </div>
    </div>
  );
};
