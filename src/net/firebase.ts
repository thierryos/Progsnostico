/**
 * Camada online sobre o Firebase Realtime Database.
 *
 * Estrutura:
 *   rooms/{code}/meta      → dados leves para a lista de salas (nome, status, contagem)
 *   rooms/{code}/game      → GameState completo (fonte da verdade da partida)
 *   rooms/{code}/presence/{playerId} → true enquanto o jogador está conectado
 *
 * Toda ação passa por `dispatch`, que aplica o motor puro dentro de uma transação
 * sobre o estado remoto atual. Assim ações repetidas ou fora de hora viram no-op,
 * sem race conditions entre clientes.
 *
 * Este módulo é carregado sob demanda (import dinâmico) para não pesar no modo offline.
 */
import { initializeApp } from 'firebase/app';
import {
  endAt,
  equalTo,
  get,
  getDatabase,
  goOffline,
  onDisconnect,
  onValue,
  orderByChild,
  query,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Database,
} from 'firebase/database';
import { createGame, humanPlayers, reduce } from '../game/engine';
import {
  GameRuleError,
  type GameAction,
  type GameMode,
  type GameState,
  type Phase,
  type RoomSettings,
} from '../game/types';
import { randomRoomCode } from '../lib/ids';
import { firebaseConfig, hasFirebaseConfig } from './config';
import { deserializeGame, serializeGame } from './serialize';

export type RoomStatus = 'open' | 'playing' | 'finished';

export interface RoomSummary {
  id: string;
  name: string;
  isPrivate: boolean;
  maxPlayers: number;
  playerCount: number;
  gameMode: GameMode;
  status: RoomStatus;
  lastActivity: number;
}

/** Salas sem atividade (nem heartbeat) por mais que isso são apagadas. */
export const STALE_ROOM_MS = 10 * 60 * 1000;
export const HEARTBEAT_MS = 60 * 1000;

let db: Database | null = null;
let fatalError: string | null = null;
const fatalListeners = new Set<(message: string) => void>();

const getDb = (): Database => {
  if (fatalError) throw new Error(fatalError);
  if (!db) {
    if (!hasFirebaseConfig()) throw new Error('Configuração do Firebase ausente (.env).');
    db = getDatabase(initializeApp(firebaseConfig));
  }
  return db;
};

/** Cota excedida ou regras negando acesso: desliga o modo online até recarregar. */
const reportError = (error: unknown) => {
  const e = error as { code?: string; message?: string } | undefined;
  const text = `${e?.code ?? ''} ${e?.message ?? ''}`.toLowerCase();
  console.error('[firebase]', error);
  if (text.includes('permission_denied') || text.includes('quota')) {
    fatalError = 'Cota excedida ou permissão negada no Firebase.';
    if (db) goOffline(db);
    fatalListeners.forEach((cb) => cb(fatalError!));
  }
};

export const onFatalError = (cb: (message: string) => void) => {
  fatalListeners.add(cb);
  return () => {
    fatalListeners.delete(cb);
  };
};

const roomPath = (roomId: string, child = '') => `rooms/${roomId}${child ? `/${child}` : ''}`;
const roomRef = (roomId: string, child?: string) => ref(getDb(), roomPath(roomId, child));

const statusOf = (phase: Phase): RoomStatus =>
  phase === 'lobby' ? 'open' : phase === 'game_over' ? 'finished' : 'playing';

const metaFromGame = (game: GameState) => ({
  name: game.settings.name,
  maxPlayers: game.settings.maxPlayers,
  gameMode: game.settings.gameMode,
  playerCount: game.players.length,
  status: statusOf(game.phase),
  lastActivity: serverTimestamp(),
});

/**
 * Hash não criptográfico (cyrb53). Só evita guardar a senha em texto puro:
 * sem Firebase Auth + regras, a senha da sala é uma barreira social, não segurança.
 */
export const hashPassword = (roomId: string, password: string) => {
  const input = `${roomId}:${password}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------

export const createRoom = async (
  settings: Partial<RoomSettings>,
  host: { id: string; name: string },
  password: string | null,
): Promise<string> => {
  const game = createGame(settings, host);
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = randomRoomCode();
      if ((await get(roomRef(id, 'meta'))).exists()) continue;
      await set(roomRef(id), {
        meta: {
          ...metaFromGame(game),
          isPrivate: Boolean(password),
          passwordHash: password ? hashPassword(id, password) : null,
          createdAt: serverTimestamp(),
        },
        game: serializeGame(game),
      });
      return id;
    }
  } catch (e) {
    reportError(e);
    throw e;
  }
  throw new Error('Não foi possível gerar um código de sala livre.');
};

export const getRoomInfo = async (roomId: string) => {
  try {
    const meta = (await get(roomRef(roomId, 'meta'))).val() as {
      name?: string;
      isPrivate?: boolean;
    } | null;
    return meta ? { name: meta.name ?? roomId, isPrivate: Boolean(meta.isPrivate) } : null;
  } catch (e) {
    reportError(e);
    throw e;
  }
};

/**
 * Aplica uma ação ao estado remoto de forma atômica.
 * Devolve o estado confirmado, ou `null` se a ação não mudou nada.
 * `GameRuleError` (sala cheia, partida iniciada) é propagado para a interface.
 */
export const dispatch = async (roomId: string, action: GameAction): Promise<GameState | null> => {
  let ruleError: GameRuleError | null = null;
  let missing = false;

  const result = await runTransaction(roomRef(roomId, 'game'), (raw: unknown) => {
    ruleError = null;
    missing = raw === null;
    // null: o SDK ainda não tem o valor em cache (ele repete com o valor real) ou a sala não existe.
    if (raw === null) return raw;
    const state = deserializeGame(raw);
    if (!state) return undefined;
    try {
      const next = reduce(state, action);
      return next === state ? undefined : serializeGame(next);
    } catch (e) {
      if (e instanceof GameRuleError) {
        ruleError = e;
        return undefined;
      }
      throw e;
    }
  }).catch((e: unknown) => {
    reportError(e);
    throw e;
  });

  if (ruleError) throw ruleError;
  if (missing && !result.snapshot.exists()) throw new GameRuleError('not_found');
  if (!result.committed) return null;

  const next = deserializeGame(result.snapshot.val());
  if (next) update(roomRef(roomId, 'meta'), metaFromGame(next)).catch(reportError);
  return next;
};

export const joinRoom = async (
  roomId: string,
  player: { id: string; name: string },
  password?: string,
) => {
  const [metaSnap, gameSnap] = await Promise.all([
    get(roomRef(roomId, 'meta')),
    get(roomRef(roomId, 'game')),
  ]).catch((e: unknown) => {
    reportError(e);
    throw e;
  });
  const meta = metaSnap.val() as { isPrivate?: boolean; passwordHash?: string } | null;
  const game = deserializeGame(gameSnap.val());
  if (!meta || !game) throw new GameRuleError('not_found');

  const isMember = game.players.some((p) => p.id === player.id && !p.isBot);
  if (meta.isPrivate && !isMember && meta.passwordHash !== hashPassword(roomId, password ?? '')) {
    throw new GameRuleError('wrong_password');
  }
  await dispatch(roomId, { type: 'join', player });
};

/** Volta para a sala depois de recarregar a página, se o jogador ainda estiver nela. */
export const resumeRoom = async (roomId: string, player: { id: string; name: string }) => {
  try {
    const game = deserializeGame((await get(roomRef(roomId, 'game'))).val());
    if (!game?.players.some((p) => p.id === player.id && !p.isBot)) return false;
    await dispatch(roomId, { type: 'join', player });
    return true;
  } catch (e) {
    if (!(e instanceof GameRuleError)) reportError(e);
    return false;
  }
};

/** Sai da sala; apaga a sala quando não sobra nenhum humano. */
export const leaveRoom = async (roomId: string, playerId: string) => {
  try {
    const next = await dispatch(roomId, { type: 'leave', playerId });
    const current = next ?? deserializeGame((await get(roomRef(roomId, 'game'))).val());
    if (!current || humanPlayers(current).length === 0) await remove(roomRef(roomId));
    else await remove(roomRef(roomId, `presence/${playerId}`));
  } catch (e) {
    if (!(e instanceof GameRuleError)) reportError(e);
  }
};

export const heartbeat = (roomId: string) =>
  update(roomRef(roomId, 'meta'), { lastActivity: serverTimestamp() }).catch(reportError);

// ---------------------------------------------------------------------------
// Assinaturas em tempo real
// ---------------------------------------------------------------------------

export const subscribeGame = (roomId: string, cb: (game: GameState | null) => void) =>
  onValue(
    roomRef(roomId, 'game'),
    (snap) => cb(deserializeGame(snap.val())),
    (e) => reportError(e),
  );

export const subscribePresence = (roomId: string, cb: (online: Set<string>) => void) =>
  onValue(
    roomRef(roomId, 'presence'),
    (snap) => cb(new Set(Object.keys((snap.val() as Record<string, unknown> | null) ?? {}))),
    (e) => reportError(e),
  );

/** Marca o jogador como conectado e remove a marca automaticamente se a conexão cair. */
export const trackPresence = (roomId: string, playerId: string) => {
  const presenceRef = roomRef(roomId, `presence/${playerId}`);
  const stop = onValue(ref(getDb(), '.info/connected'), (snap) => {
    if (snap.val() !== true) return;
    onDisconnect(presenceRef)
      .remove()
      .then(() => set(presenceRef, true))
      .catch(reportError);
  });
  return () => {
    stop();
    onDisconnect(presenceRef)
      .cancel()
      .catch(() => {});
  };
};

/**
 * Lista salas abertas. Com `".indexOn": ["meta/status", "meta/lastActivity"]` em
 * `rooms` nas regras do banco, o filtro roda no servidor e só as salas abertas são baixadas.
 */
export const subscribeOpenRooms = (cb: (rooms: RoomSummary[]) => void) =>
  onValue(
    query(ref(getDb(), 'rooms'), orderByChild('meta/status'), equalTo('open')),
    (snap) => {
      const rooms: RoomSummary[] = [];
      const now = Date.now();
      snap.forEach((child) => {
        const m = child.child('meta').val() as Partial<RoomSummary> | null;
        if (!m || !child.key || now - (m.lastActivity ?? 0) > STALE_ROOM_MS) return;
        rooms.push({
          id: child.key,
          name: m.name ?? child.key,
          isPrivate: Boolean(m.isPrivate),
          maxPlayers: m.maxPlayers ?? 0,
          playerCount: m.playerCount ?? 0,
          gameMode: m.gameMode === 'up_down' ? 'up_down' : 'up',
          status: 'open',
          lastActivity: m.lastActivity ?? 0,
        });
      });
      cb(rooms.sort((a, b) => b.lastActivity - a.lastActivity));
    },
    (e) => {
      reportError(e);
      cb([]);
    },
  );

/** Apaga salas abandonadas (inclusive as do formato antigo, sem `meta`). */
export const cleanupStaleRooms = async () => {
  try {
    const snap = await get(
      query(
        ref(getDb(), 'rooms'),
        orderByChild('meta/lastActivity'),
        endAt(Date.now() - STALE_ROOM_MS),
      ),
    );
    const ids: string[] = [];
    snap.forEach((child) => {
      if (child.key) ids.push(child.key);
    });
    await Promise.all(ids.map((id) => remove(roomRef(id))));
    return ids.length;
  } catch (e) {
    reportError(e);
    return 0;
  }
};
