import { useCallback, useState } from 'react';
import { reduce } from '../game/engine';
import type { GameAction, GameState } from '../game/types';
import { useGameDriver } from '../hooks/useGameDriver';
import { RoomView } from './RoomView';

interface OfflineRoomProps {
  initial: GameState;
  localId: string;
  onExit: () => void;
}

/** Partida local contra bots: o mesmo motor, sem rede. */
export const OfflineRoom = ({ initial, localId, onExit }: OfflineRoomProps) => {
  const [game, setGame] = useState(initial);
  const dispatch = useCallback((action: GameAction) => setGame((g) => reduce(g, action)), []);

  useGameDriver(game, dispatch, true);

  return (
    <RoomView
      game={game}
      localId={localId}
      mode="offline"
      roomCode={null}
      dispatch={dispatch}
      onLeave={onExit}
    />
  );
};
