import type { GameAction, GameState } from '../game/types';
import { useI18n } from '../i18n';
import { shareRoom } from '../lib/share';
import { useNotice } from '../components/ui/Notice';
import { GameScreen, type RoomMode } from '../screens/GameScreen';
import { WaitingRoom } from '../screens/WaitingRoom';

interface RoomViewProps {
  game: GameState;
  localId: string;
  mode: RoomMode;
  roomCode: string | null;
  dispatch: (action: GameAction) => void;
  onLeave: () => void;
}

/** Escolhe a tela pela fase: sala de espera ou mesa de jogo. */
export const RoomView = ({ game, localId, mode, roomCode, dispatch, onLeave }: RoomViewProps) => {
  const { t } = useI18n();
  const notify = useNotice();

  if (game.phase === 'lobby') {
    const share = async () => {
      if (!roomCode) return;
      const result = await shareRoom(roomCode, t('shareText', { code: roomCode }));
      if (result === 'copied') notify(t('linkCopied'));
      if (result === 'failed') notify(t('codeIs', { code: roomCode }));
    };
    return (
      <WaitingRoom
        game={game}
        localId={localId}
        roomCode={roomCode}
        dispatch={dispatch}
        onLeave={onLeave}
        onShare={share}
      />
    );
  }

  return (
    <GameScreen game={game} localId={localId} mode={mode} dispatch={dispatch} onLeave={onLeave} />
  );
};
