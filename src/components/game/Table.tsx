import { Trophy } from 'lucide-react';
import { useElementSize } from '../../hooks/useElementSize';
import type { GameState } from '../../game/types';
import { useI18n } from '../../i18n';
import { WinBurst } from '../fx/WinBurst';
import { PlayingCard } from '../PlayingCard';
import { SUIT_TEXT_ON_DARK, SuitIcon } from '../SuitIcon';
import {
  LEAD_CHIP,
  OVERLAP_TOLERANCE,
  WINNER_SCALE,
  blockHeight,
  layoutTable,
  trumpPanel,
} from './tableLayout';

/** Rotação "aleatória" estável por carta, para a mesa parecer natural. */
const tilt = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 9) - 4;
};

/** Feltro com as cartas jogadas (posições calculadas em `tableLayout.ts`). */
export const Table = ({ game, localId }: { game: GameState; localId: string }) => {
  const { t } = useI18n();
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();

  const n = Math.max(1, game.players.length);
  const myIndex = Math.max(
    0,
    game.players.findIndex((p) => p.id === localId),
  );
  const panel = trumpPanel(width);
  const layout = layoutTable(width, height, n, [LEAD_CHIP, panel.rect]);
  const cardW = layout.cardW;
  const winnerId = game.phase === 'trick_summary' ? game.trickResult?.winnerId : undefined;
  const trumpSuit = game.trumpCard?.suit ?? null;
  // Na fileira (mesa baixa) o painel só aparece se couber acima das cartas.
  const showTrumpPanel =
    width > 0 &&
    (layout.mode === 'ring' ||
      height / 2 - blockHeight(cardW) / 2 >= panel.rect.y + panel.rect.h - OVERLAP_TOLERANCE);

  return (
    <div className="relative min-h-0 flex-1 px-2 pb-2">
      {/* Borda de madeira com relevo (luz em cima, sombra embaixo). */}
      <div className="h-full rounded-[2.6rem] bg-[linear-gradient(180deg,#8b5a33_0%,#5c3a21_40%,#3b2414_100%)] p-[7px] shadow-[0_14px_30px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_220_170/0.35),inset_0_-2px_0_rgb(0_0_0/0.45)]">
        <div
          id="table-area"
          ref={ref}
          className="relative h-full w-full overflow-hidden rounded-[2.2rem] bg-felt shadow-[inset_0_0_0_2px_rgb(0_0_0/0.35),inset_0_8px_26px_rgb(0_0_0/0.55)]"
        >
          {/* Foco de luz no centro do feltro + fibras do tecido. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_78%_62%_at_50%_42%,#2b7a53_0%,#1a4731_55%,#0b2217_100%)]" />
          <div className="felt-fibers pointer-events-none absolute inset-0 opacity-80 mix-blend-soft-light" />
          <div className="pointer-events-none absolute inset-3 rounded-[1.7rem] border border-[#f5d27a]/20" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center font-display text-6xl whitespace-nowrap text-black/20 select-none sm:text-8xl">
            {t('gameTitle')}
          </div>

          {game.leadSuit && (
            <div className="absolute top-4 left-4 z-30 flex flex-col rounded-xl bg-black/55 px-2.5 py-1 leading-none animate-in fade-in zoom-in-90">
              <span className="text-xs tracking-widest text-slate-300 uppercase">
                {t('leadSuit')}
              </span>
              <span
                className={`flex items-center gap-1 text-lg uppercase ${SUIT_TEXT_ON_DARK[game.leadSuit]}`}
              >
                <SuitIcon suit={game.leadSuit} size={16} />
                {t(`suit_${game.leadSuit}`)}
              </span>
            </div>
          )}

          {showTrumpPanel && (
            <div
              id="trump-card"
              className="absolute z-30 flex items-center gap-2 rounded-xl border border-balatro-gold/60 bg-black/60 p-1.5 shadow-[0_0_18px_rgb(234_179_8/0.25)] animate-in fade-in zoom-in-90 short:hidden"
              style={{
                left: panel.rect.x,
                top: panel.rect.y,
                width: panel.rect.w,
                height: panel.rect.h,
              }}
            >
              {game.trumpCard ? (
                <PlayingCard card={game.trumpCard} width={panel.cardW} trump tilt idle={0} />
              ) : (
                <div
                  className="grid shrink-0 place-items-center rounded-md border-2 border-dashed border-white/30 text-white/40"
                  style={{ width: panel.cardW, height: panel.rect.h - 12 }}
                >
                  ✕
                </div>
              )}
              <div className="flex min-w-0 flex-col leading-none">
                <span className="text-xs tracking-widest text-balatro-gold uppercase">
                  {t('trump')}
                </span>
                {trumpSuit ? (
                  <span
                    className={`flex items-center gap-1 text-base uppercase ${SUIT_TEXT_ON_DARK[trumpSuit]}`}
                  >
                    <SuitIcon suit={trumpSuit} size={14} />
                    {t(`suit_${trumpSuit}`)}
                  </span>
                ) : (
                  <span className="text-base text-slate-300 uppercase">{t('noTrump')}</span>
                )}
                <span className="mt-0.5 text-sm leading-tight text-slate-300">
                  {trumpSuit ? t('trumpBeats') : t('noTrumpHint')}
                </span>
              </div>
            </div>
          )}

          {width > 0 &&
            game.tableCards.map((played, i) => {
              const playerIdx = game.players.findIndex((p) => p.id === played.playerId);
              const seat = (playerIdx - myIndex + n) % n;
              const { x, y } = layout.position(seat, i);
              const isWinner = winnerId === played.playerId;
              const name = game.players[playerIdx]?.name ?? '?';

              return (
                <div
                  key={played.card.id}
                  className="absolute flex flex-col items-center transition-[scale,filter] duration-300"
                  style={{
                    left: x,
                    top: y,
                    translate: '-50% -50%',
                    rotate: `${isWinner ? 0 : tilt(played.card.id)}deg`,
                    zIndex: isWinner ? 20 : i + 1,
                    scale: isWinner ? WINNER_SCALE : 1,
                    filter: isWinner
                      ? 'drop-shadow(0 0 14px rgb(234 179 8 / 0.65))'
                      : winnerId
                        ? 'brightness(0.55) saturate(0.8)'
                        : undefined,
                  }}
                >
                  <div className="animate-card-slam">
                    <PlayingCard
                      card={played.card}
                      width={cardW}
                      highlighted={isWinner}
                      shine={isWinner}
                      trump={played.card.suit === trumpSuit}
                    />
                  </div>
                  {isWinner && (
                    <>
                      <WinBurst radius={cardW * 0.95} />
                      <span className="absolute -top-3 left-1/2 z-40 -translate-x-1/2 animate-pop rounded-full border-2 border-white bg-green-500 p-1 text-black shadow-lg">
                        <Trophy size={cardW < 70 ? 11 : 14} />
                      </span>
                    </>
                  )}
                  <span
                    className="mt-1 truncate rounded-full border border-balatro-gold/40 bg-black/80 px-2 text-sm leading-tight text-balatro-gold"
                    style={{ maxWidth: cardW + 20 }}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
