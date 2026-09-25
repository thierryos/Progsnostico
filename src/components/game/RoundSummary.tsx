import { ArrowRight, Check, Crown, House } from 'lucide-react';
import type { GameState } from '../../game/types';
import { useI18n } from '../../i18n';
import { Confetti } from '../fx/Confetti';
import { Button } from '../ui/Button';
import { Kbd } from '../ui/Kbd';
import { Sheet } from '../ui/Sheet';

interface RoundSummaryProps {
  game: GameState;
  localId: string;
  onReady: () => void;
  onLeave: () => void;
}

/** Placar entre rodadas e tela de fim de jogo. Linhas em 2 níveis para caber em 360px. */
export const RoundSummary = ({ game, localId, onReady, onLeave }: RoundSummaryProps) => {
  const { t } = useI18n();
  const isGameOver = game.phase === 'game_over';
  const me = game.players.find((p) => p.id === localId);
  const results = [...(game.roundResults ?? [])].sort((a, b) => b.totalScore - a.totalScore);
  const topScore = results[0]?.totalScore ?? 0;
  const winners = results.filter((r) => r.totalScore === topScore);
  const readyCount = game.players.filter((p) => p.isReady).length;

  const title = isGameOver ? (
    <span>{t('gameOver')}</span>
  ) : (
    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
      <span>{t('scoreboard')}</span>
      <span className="text-lg text-slate-400 normal-case">
        {t('roundOf', { n: game.roundIndex + 1, total: game.roundSequence.length })}
      </span>
    </span>
  );

  const footer = isGameOver ? (
    <Button variant="neutral" size="lg" block icon={<House size={24} />} onClick={onLeave}>
      {t('backToMenu')}
    </Button>
  ) : (
    <div className="flex flex-col gap-2">
      <div className="text-center text-lg text-slate-400">
        {t('readyPlayers', { n: readyCount, total: game.players.length })}
      </div>
      <Button
        variant={me?.isReady ? 'success' : 'danger'}
        size="lg"
        block
        disabled={me?.isReady}
        onClick={onReady}
      >
        {me?.isReady ? t('waiting') : t('nextRound')}
        {!me?.isReady && <ArrowRight size={24} />}
        {!me?.isReady && <Kbd>{t('keyEnter')}</Kbd>}
      </Button>
    </div>
  );

  return (
    <>
      {isGameOver && <Confetti />}
      <Sheet open id="round-summary" title={title} footer={footer}>
        {isGameOver && (
          <div className="crt-text text-extrude px-4 pt-5 text-center font-display text-5xl leading-none text-balatro-gold animate-in zoom-in-75 duration-500">
            {winners.length > 1 ? t('tie') : t('winnerIs', { name: winners[0]?.playerName ?? '' })}
          </div>
        )}
        <ul className="flex flex-col gap-2 p-3">
          {results.map((r) => {
            const hit = r.bid === r.won;
            const isMe = r.playerId === localId;
            const ready = game.players.find((p) => p.id === r.playerId)?.isReady;
            const rank = results.findIndex((x) => x.totalScore === r.totalScore) + 1;
            return (
              <li
                key={r.playerId}
                className={`rounded-xl border-2 px-3 py-2 ${isMe ? 'border-balatro-blue bg-slate-800' : 'border-slate-700 bg-slate-900'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 text-center text-xl text-balatro-gold">
                    {rank === 1 ? <Crown size={20} className="mx-auto" /> : rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-2xl text-white">
                    {r.playerName}
                    {isMe && <span className="ml-1 text-base text-slate-400">({t('you')})</span>}
                  </span>
                  <span className="text-3xl text-balatro-blue">{r.totalScore}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 pl-9 text-lg">
                  <span className="text-slate-400">
                    {t('bidWon')}: <span className="text-white">{r.bid}</span> /{' '}
                    <span className={hit ? 'text-green-400' : 'text-red-400'}>{r.won}</span>
                  </span>
                  <span className={`text-base ${hit ? 'text-green-400' : 'text-red-400'}`}>
                    {hit ? t('hit') : t('miss')}
                  </span>
                  <span className="text-balatro-gold">+{r.scoreDelta}</span>
                  {!isGameOver && (
                    <span className="ml-auto">
                      {ready ? (
                        <Check size={20} className="text-green-500" />
                      ) : (
                        <span className="text-slate-600">…</span>
                      )}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
};
