import type { GameState } from '../../game/types';
import { useI18n } from '../../i18n';
import { PlayingCard } from '../PlayingCard';
import { SUIT_TEXT_ON_DARK, SuitIcon } from '../SuitIcon';
import { Sheet } from '../ui/Sheet';

export const HistorySheet = ({ game, onClose }: { game: GameState; onClose: () => void }) => {
  const { t } = useI18n();
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? '?';

  return (
    <Sheet open onClose={onClose} title={t('history')} size="tall" closeLabel={t('close')}>
      <ol className="flex flex-col gap-3 p-3">
        {[...game.trickHistory].reverse().map((trick) => (
          <li
            key={trick.trickNumber}
            className="rounded-2xl border-2 border-slate-700 bg-slate-800 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-lg tracking-widest text-slate-400 uppercase">
                {t('trickN', { n: trick.trickNumber })}
              </span>
              <span className={`flex items-center gap-1 ${SUIT_TEXT_ON_DARK[trick.leadSuit]}`}>
                <SuitIcon suit={trick.leadSuit} size={14} /> {t(`suit_${trick.leadSuit}`)}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {trick.cards.map((pc) => {
                const isWinner = pc.playerId === trick.winnerId;
                return (
                  <div key={pc.card.id} className="flex w-14 flex-col items-center gap-1">
                    <PlayingCard card={pc.card} width={48} highlighted={isWinner} />
                    <span
                      className={`w-full truncate text-center text-sm ${isWinner ? 'text-balatro-gold' : 'text-slate-400'}`}
                    >
                      {name(pc.playerId)}
                    </span>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
        {game.trickHistory.length === 0 && (
          <li className="py-10 text-center text-2xl text-slate-500">{t('noHistory')}</li>
        )}
      </ol>
    </Sheet>
  );
};
