import { ArrowDown, Hourglass, Trophy } from 'lucide-react';
import { useEffect } from 'react';
import { useElementSize } from '../../hooks/useElementSize';
import { SHORT_SCREEN, useMediaQuery } from '../../hooks/useMediaQuery';
import type { GameState, Player } from '../../game/types';
import { useI18n } from '../../i18n';
import { WinBurst } from '../fx/WinBurst';
import { CARD_RATIO, PlayingCard } from '../PlayingCard';
import { SUIT_TEXT_ON_DARK, SuitIcon } from '../SuitIcon';
import { WINNER_SCALE, labelFont, planTable } from './tableLayout';

/** Rotação "aleatória" estável por carta, para a mesa parecer natural. */
const tilt = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 9) - 4;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

interface TableProps {
  game: GameState;
  localId: string;
  /** Avisa se o painel do trunfo coube na mesa (senão a barra superior mostra o trunfo). */
  onTrumpShown?: (shown: boolean) => void;
}

/** Feltro com as cartas jogadas (posições calculadas em `tableLayout.ts`). */
export const Table = ({ game, localId, onTrumpShown }: TableProps) => {
  const { t } = useI18n();
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const short = useMediaQuery(SHORT_SCREEN);

  const n = Math.max(1, game.players.length);
  const myIndex = Math.max(
    0,
    game.players.findIndex((p) => p.id === localId),
  );
  const { layout, leadChip, trump } = planTable(width, height, n, {
    trump: !short,
    bidding: game.phase === 'bidding',
  });
  const cardW = layout.cardW;
  const winnerId = game.phase === 'trick_summary' ? game.trickResult?.winnerId : undefined;
  const trumpSuit = game.trumpCard?.suit ?? null;
  const chipScale = leadChip.w / 128;
  // Antes da 1ª medição (largura 0) supõe que cabe, para a barra superior não piscar.
  const trumpShown = !short && (width === 0 || trump !== null);

  useEffect(() => {
    onTrumpShown?.(trumpShown);
  }, [trumpShown, onTrumpShown]);

  // Assentos vazios: mostram onde cada um senta, de quem é a vez e (no palpite) quanto pediu.
  const playedBy = new Set(game.tableCards.map((c) => c.playerId));
  const showSeats =
    width > 0 && layout.mode === 'ring' && (game.phase === 'bidding' || game.phase === 'playing');

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
          {/* Marca d'água só na fileira: no anel os assentos ocupam o centro (no palpite, o trunfo). */}
          {layout.mode === 'row' && trump?.placement !== 'center' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center font-display text-6xl whitespace-nowrap text-black/20 select-none sm:text-8xl">
              {t('gameTitle')}
            </div>
          )}

          {game.leadSuit && (
            <div
              className="absolute z-30 flex flex-col rounded-xl bg-black/55 leading-none animate-in fade-in zoom-in-90"
              style={{
                left: leadChip.x,
                top: leadChip.y,
                maxWidth: leadChip.w,
                padding: `${4 * chipScale}px ${10 * chipScale}px`,
              }}
            >
              <span
                className="tracking-widest text-slate-300 uppercase"
                style={{ fontSize: 12 * chipScale }}
              >
                {t('leadSuit')}
              </span>
              <span
                className={`flex items-center gap-1 uppercase ${SUIT_TEXT_ON_DARK[game.leadSuit]}`}
                style={{ fontSize: 18 * chipScale }}
              >
                <SuitIcon suit={game.leadSuit} size={16 * chipScale} />
                {t(`suit_${game.leadSuit}`)}
              </span>
            </div>
          )}

          {trump && width > 0 && (
            <div
              id="trump-card"
              className="absolute z-30 flex items-center rounded-xl border border-balatro-gold/60 bg-black/60 shadow-[0_0_18px_rgb(234_179_8/0.25)] animate-in fade-in zoom-in-90"
              style={{
                left: trump.rect.x,
                top: trump.rect.y,
                width: trump.rect.w,
                height: trump.rect.h,
                padding: 6 * trump.scale,
                gap: 8 * trump.scale,
              }}
            >
              {game.trumpCard ? (
                <PlayingCard card={game.trumpCard} width={trump.cardW} trump tilt idle={0} />
              ) : (
                <div
                  className="grid shrink-0 place-items-center rounded-md border-2 border-dashed border-white/30 text-white/40"
                  style={{ width: trump.cardW, height: trump.cardW * CARD_RATIO }}
                >
                  ✕
                </div>
              )}
              <div className="flex min-w-0 flex-col leading-none">
                <span
                  className="tracking-widest text-balatro-gold uppercase"
                  style={{ fontSize: 12 * trump.scale }}
                >
                  {t('trump')}
                </span>
                {trumpSuit ? (
                  <span
                    className={`flex items-center gap-1 uppercase ${SUIT_TEXT_ON_DARK[trumpSuit]}`}
                    style={{ fontSize: 16 * trump.scale }}
                  >
                    <SuitIcon suit={trumpSuit} size={14 * trump.scale} />
                    {t(`suit_${trumpSuit}`)}
                  </span>
                ) : (
                  <span className="text-slate-300 uppercase" style={{ fontSize: 16 * trump.scale }}>
                    {t('noTrump')}
                  </span>
                )}
                <span
                  className="mt-0.5 leading-tight text-slate-300"
                  style={{ fontSize: 14 * trump.scale }}
                >
                  {trumpSuit ? t('trumpBeats') : t('noTrumpHint')}
                </span>
              </div>
            </div>
          )}

          {showSeats &&
            game.players.map((p, idx) => {
              if (playedBy.has(p.id)) return null;
              const { x, y } = layout.position((idx - myIndex + n) % n, 0);
              return (
                <Seat
                  key={p.id}
                  player={p}
                  x={x}
                  y={y}
                  cardW={cardW}
                  isTurn={game.currentTurn === p.id}
                  isMe={p.id === localId}
                  bidding={game.phase === 'bidding'}
                />
              );
            })}

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
                        <Trophy size={Math.round(clamp(cardW * 0.14, 11, 18))} />
                      </span>
                    </>
                  )}
                  <NameLabel name={name} cardW={cardW} />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

/** Nome embaixo da carta ou do assento; dourado cheio quando é a vez da pessoa. */
const NameLabel = ({
  name,
  cardW,
  active = false,
}: {
  name: string;
  cardW: number;
  active?: boolean;
}) => (
  <span
    className={`mt-1 truncate rounded-full border px-2 leading-tight transition-colors ${
      active
        ? 'border-balatro-gold bg-balatro-gold text-black'
        : 'border-balatro-gold/40 bg-black/80 text-balatro-gold'
    }`}
    style={{ maxWidth: cardW + 20, fontSize: labelFont(cardW) }}
  >
    {name}
  </span>
);

interface SeatProps {
  player: Player;
  x: number;
  y: number;
  cardW: number;
  isTurn: boolean;
  isMe: boolean;
  bidding: boolean;
}

/** Lugar de quem ainda não jogou nesta vaza: contorno da carta que vai cair ali. */
const Seat = ({ player, x, y, cardW, isTurn, isMe, bidding }: SeatProps) => {
  const { t } = useI18n();
  const icon = Math.round(cardW * 0.34);
  const bid = bidding ? player.currentBid : null;

  let content = null;
  if (bid !== null) {
    content = (
      <span key={bid} className="flex animate-pop flex-col items-center leading-none">
        <span className="text-white" style={{ fontSize: cardW * 0.42 }}>
          {bid}
        </span>
        <span
          className="tracking-wider text-slate-300 uppercase"
          style={{ fontSize: labelFont(cardW) * 0.8 }}
        >
          {t('bid')}
        </span>
      </span>
    );
  } else if (isTurn && isMe && bidding) {
    content = <span style={{ fontSize: cardW * 0.42 }}>?</span>;
  } else if (isTurn && isMe) {
    content = <ArrowDown size={icon} className="animate-bob" />;
  } else if (isTurn) {
    content = <Hourglass size={icon} className="animate-pulse" />;
  }

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: x, top: y, translate: '-50% -50%' }}
    >
      <div
        className={`grid place-items-center rounded-[9%/6.5%] border-2 border-dashed transition-colors ${
          isTurn
            ? 'animate-glow-pulse border-balatro-gold bg-balatro-gold/10 text-balatro-gold'
            : 'border-white/15 bg-black/15 text-white/60'
        }`}
        style={{ width: cardW, height: cardW * CARD_RATIO }}
      >
        {content}
      </div>
      <NameLabel name={player.name} cardW={cardW} active={isTurn} />
    </div>
  );
};
