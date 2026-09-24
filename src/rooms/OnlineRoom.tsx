import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthorityId } from '../game/selectors';
import { GameRuleError, type GameAction, type GameState } from '../game/types';
import { useGameDriver } from '../hooks/useGameDriver';
import type { TranslationKey } from '../i18n';
import type { Net } from '../net';
import { RoomView } from './RoomView';

/** Tempo que um jogador pode ficar desconectado antes de um bot assumir (ou sair da sala de espera). */
const AWAY_GRACE_MS = 30_000;
const AWAY_CHECK_MS = 5_000;

interface OnlineRoomProps {
  net: Net;
  roomId: string;
  localId: string;
  onExit: (notice?: TranslationKey) => void;
  onError: (notice: TranslationKey) => void;
}

export const OnlineRoom = ({ net, roomId, localId, onExit, onError }: OnlineRoomProps) => {
  /** undefined = carregando; null = a sala não existe mais. */
  const [game, setGame] = useState<GameState | null | undefined>(undefined);
  const [online, setOnline] = useState<Set<string> | null>(null);
  const leaving = useRef(false);

  useEffect(() => net.subscribeGame(roomId, setGame), [net, roomId]);
  useEffect(() => net.subscribePresence(roomId, setOnline), [net, roomId]);
  useEffect(() => net.trackPresence(roomId, localId), [net, roomId, localId]);

  const dispatch = useCallback(
    (action: GameAction) => {
      net.dispatch(roomId, action).catch((e: unknown) => {
        if (leaving.current) return;
        onError(e instanceof GameRuleError ? `err_${e.code}` : 'err_generic');
      });
    },
    [net, roomId, onError],
  );

  const me = game?.players.find((p) => p.id === localId);

  // Sala apagada ou jogador removido pelo host.
  useEffect(() => {
    if (leaving.current || game === undefined) return;
    if (game === null) onExit('notice_room_closed');
    else if (!me || me.isBot) onExit('notice_kicked');
  }, [game, me, onExit]);

  // Voltou depois de cair: retoma a cadeira que um bot estava segurando.
  useEffect(() => {
    if (me?.isAway) dispatch({ type: 'setAway', playerId: localId, away: false });
  }, [me?.isAway, dispatch, localId]);

  const presence = online ? new Set([...online, localId]) : null;
  const isAuthority = !!game && getAuthorityId(game, presence ?? new Set([localId])) === localId;

  useGameDriver(game, dispatch, isAuthority);
  useAwayMonitor(game, online, isAuthority, localId, dispatch);

  useEffect(() => {
    if (!isAuthority) return;
    const timer = window.setInterval(() => void net.heartbeat(roomId), net.HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [isAuthority, net, roomId]);

  const leave = useCallback(() => {
    leaving.current = true;
    void net.leaveRoom(roomId, localId);
    onExit();
  }, [net, roomId, localId, onExit]);

  if (!game || !me) return null;

  return (
    <RoomView
      game={game}
      localId={localId}
      mode="online"
      roomCode={roomId}
      dispatch={dispatch}
      onLeave={leave}
    />
  );
};

/** A autoridade marca como ausente quem ficou desconectado além do tempo de tolerância. */
const useAwayMonitor = (
  game: GameState | null | undefined,
  online: Set<string> | null,
  enabled: boolean,
  localId: string,
  dispatch: (action: GameAction) => void,
) => {
  const missingSince = useRef(new Map<string, number>());
  const latest = useRef({ game, online });

  useEffect(() => {
    latest.current = { game, online };
  }, [game, online]);

  useEffect(() => {
    if (!enabled) {
      missingSince.current.clear();
      return;
    }
    const check = () => {
      const { game: g, online: o } = latest.current;
      if (!g || !o) return;
      const now = Date.now();
      for (const p of g.players) {
        if (p.isBot || p.isAway || p.id === localId || o.has(p.id)) {
          missingSince.current.delete(p.id);
          continue;
        }
        const since = missingSince.current.get(p.id) ?? now;
        missingSince.current.set(p.id, since);
        if (now - since >= AWAY_GRACE_MS) {
          missingSince.current.delete(p.id);
          dispatch({ type: 'setAway', playerId: p.id, away: true });
        }
      }
    };
    check();
    const timer = window.setInterval(check, AWAY_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [enabled, localId, dispatch]);
};
