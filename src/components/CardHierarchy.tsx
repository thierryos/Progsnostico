import { RANKS } from '../game/cards';
import { useI18n } from '../i18n';

/** "Força: A > K > Q > … > 2". Quebra em várias linhas em telas estreitas. */
export const CardHierarchy = () => {
  const { t } = useI18n();
  const ranks = [...RANKS].reverse();

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 rounded-2xl border border-slate-700 bg-black/60 px-3 py-1.5">
      <span className="mr-1 text-sm tracking-widest text-slate-400 uppercase">
        {t('strength')}:
      </span>
      {ranks.map((rank, i) => (
        <span key={rank} className="flex items-center gap-1">
          <span
            className={`text-lg font-bold ${['A', 'K', 'Q', 'J'].includes(rank) ? 'text-balatro-gold' : 'text-slate-200'}`}
          >
            {rank}
          </span>
          {i < ranks.length - 1 && <span className="text-xs text-slate-600">›</span>}
        </span>
      ))}
    </div>
  );
};
