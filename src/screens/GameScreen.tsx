import { useState } from 'react';
import { BidPanel, PlayerBar, TrickSummaryPanel } from '../components/game/BottomPanels';
import { Hand } from '../components/game/Hand';
import { HelpModal } from '../components/game/HelpModal';
import { HistorySheet } from '../components/game/HistorySheet';
import { OpponentStrip } from '../components/game/OpponentStrip';
import { RoundSummary } from '../components/game/RoundSummary';
import { Scoreboard } from '../components/game/Scoreboard';
import { Table } from '../components/game/Table';
import { TopBar } from '../components/game/TopBar';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { useGameFeedback } from '../hooks/useGameFeedback';
import { isValidMove } from '../game/rules';
import type { Card, GameAction, GameState } from '../game/types';
import { useI18n } from '../i18n';
import { playSound } from '../lib/sound';

export type RoomMode = 'online' | 'offline' | 'tutorial';

export interface GameScreenProps {
  game: GameState;
  localId: string;
  mode: RoomMode;
  dispatch: (action: GameAction) => void;
  onLeave: () => void;
  /** Ganchos do tutorial: interceptar o histórico, jogar com 1 toque, esconder o placar. */
  tutorial?: {
    onHistoryClick: () => void;
    hideRoundSummary: boolean;
  };
}

type Panel = 'none' | 'scoreboard' | 'history' | 'help' | 'exit';

export const GameScreen = ({
  game,
  localId,
  mode,
  dispatch,
  onLeave,
  tutorial,
}: GameScreenProps) => {
  const { t } = useI18n();
  const [panel, setPanel] = useState<Panel>('none');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useGameFeedback(game, localId);

  const me = game.players.find((p) => p.id === localId);
  if (!me) return null;

  const myTurn = game.currentTurn === localId;
  const canPlay = (card: Card) => isValidMove(card, me.hand, game.leadSuit);
  const selectedStillValid = selectedId !== null && me.hand.some((c) => c.id === selectedId);

  const bottom =
    game.phase === 'bidding' && myTurn ? (
      <BidPanel
        game={game}
        me={me}
        onBid={(amount) => {
          playSound('bid');
          dispatch({ type: 'bid', playerId: localId, amount });
        }}
      />
    ) : game.phase === 'trick_summary' ? (
      <TrickSummaryPanel
        game={game}
        me={me}
        onReady={() => dispatch({ type: 'ready', playerId: localId })}
      />
    ) : (
      <PlayerBar game={game} me={me} hint={myTurn && selectedStillValid ? 'tapAgain' : null} />
    );

  const openHistory = () => (tutorial ? tutorial.onHistoryClick() : setPanel('history'));
  const showRoundSummary =
    (game.phase === 'round_end' || game.phase === 'game_over') && !tutorial?.hideRoundSummary;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside className="thin-scrollbar hidden w-72 shrink-0 overflow-y-auto border-r-4 border-slate-800 bg-balatro-panel/95 lg:block">
        <Scoreboard game={game} localId={localId} />
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          game={game}
          center={<OpponentStrip game={game} localId={localId} inline />}
          onOpenScoreboard={() => setPanel('scoreboard')}
          onOpenHistory={openHistory}
          onOpenHelp={() => setPanel('help')}
          onExit={() => setPanel('exit')}
        />
        <OpponentStrip game={game} localId={localId} />
        <Table game={game} localId={localId} />
        {bottom}
        <Hand
          cards={me.hand}
          dealKey={game.roundIndex}
          interactive={myTurn && game.phase === 'playing'}
          canPlay={canPlay}
          selectedId={selectedStillValid ? selectedId : null}
          onSelect={setSelectedId}
          onPlay={(card) => dispatch({ type: 'play', playerId: localId, cardId: card.id })}
          quickPlay={mode === 'tutorial'}
        />
      </main>

      {panel === 'scoreboard' && (
        <Sheet
          open
          onClose={() => setPanel('none')}
          title={t('scoreboard')}
          closeLabel={t('close')}
        >
          <Scoreboard game={game} localId={localId} />
        </Sheet>
      )}
      {panel === 'history' && <HistorySheet game={game} onClose={() => setPanel('none')} />}
      {panel === 'help' && <HelpModal onClose={() => setPanel('none')} />}
      {panel === 'exit' && (
        <Sheet
          open
          onClose={() => setPanel('none')}
          title={t('exitTitle')}
          closeLabel={t('close')}
          footer={
            <div className="flex gap-2">
              <Button variant="neutral" block onClick={() => setPanel('none')}>
                {t('cancel')}
              </Button>
              <Button variant="danger" block onClick={onLeave}>
                {t('exitConfirm')}
              </Button>
            </div>
          }
        >
          <p className="p-4 text-xl text-slate-300">
            {mode === 'online' ? t('exitOnline') : t('exitOffline')}
          </p>
        </Sheet>
      )}

      {showRoundSummary && (
        <RoundSummary
          game={game}
          localId={localId}
          onReady={() => dispatch({ type: 'ready', playerId: localId })}
          onLeave={onLeave}
        />
      )}
    </div>
  );
};
