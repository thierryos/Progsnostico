import { BID_STATUS_COLOR, bidStatus } from '../../game/selectors';
import type { Player } from '../../game/types';
import { useI18n } from '../../i18n';

/** Acima disso as bolinhas não cabem no cartão do oponente: volta para números. */
const MAX_PIPS = 7;

/**
 * Palpite como bolinhas, fácil de ler de relance:
 * vazias = duelos que ainda faltam, cheias = vencidos, vermelhas = passou do palpite.
 */
export const BidPips = ({ player, size = 7 }: { player: Player; size?: number }) => {
  const { t } = useI18n();
  const bid = player.currentBid;
  const won = player.tricksWon;
  const status = bidStatus(player);
  const label = `${t('bid')} ${bid ?? '–'} · ${t('won')} ${won}`;

  if (bid === null) {
    return (
      <span className="text-slate-500" title={label}>
        –
      </span>
    );
  }
  const total = Math.max(bid, won);
  if (total === 0 || total > MAX_PIPS) {
    return (
      <span className={BID_STATUS_COLOR[status]} title={label}>
        {total === 0 ? '0' : `${won}/${bid}`}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-[3px]" role="img" aria-label={label} title={label}>
      {Array.from({ length: total }, (_, i) => {
        const over = i >= bid;
        const filled = i < won;
        const color = over
          ? 'border-balatro-red bg-balatro-red'
          : filled
            ? status === 'onSpot'
              ? 'border-green-400 bg-green-400'
              : 'border-balatro-gold bg-balatro-gold'
            : 'border-slate-400 bg-transparent';
        return (
          <span
            key={i}
            className={`inline-block rounded-full border-[1.5px] transition-colors ${color} ${filled ? 'animate-pop' : ''}`}
            style={{ width: size, height: size }}
          />
        );
      })}
    </span>
  );
};
