/**
 * Integração com o SDK REAL do Firebase contra o emulador local, usando as regras de
 * `firebase-rules.json`. Não roda no `npm test`; use `npm run test:emulator`
 * (precisa de Java 11+; o firebase-tools sobe o emulador e define FIREBASE_DATABASE_EMULATOR_HOST).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAutomated, isTrickComplete } from '../game/engine';
import type { GameAction, GameState } from '../game/types';
import * as net from './firebase';

const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? '127.0.0.1:9000';
const NS = 'demo-prognostico-default-rtdb';

vi.mock('./config', () => ({
  firebaseConfig: {
    apiKey: 'demo-key',
    projectId: 'demo-prognostico',
    databaseURL: `http://127.0.0.1:9000?ns=demo-prognostico-default-rtdb`,
  },
  hasFirebaseConfig: () => true,
  emulatorHost: process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? '127.0.0.1:9000',
}));

/** REST do emulador. `admin` ignora as regras (token "owner" do emulador). */
const rest = async (path: string, init: RequestInit = {}, admin = false) => {
  const res = await fetch(`http://${HOST}/${path}.json?ns=${NS}`, {
    ...init,
    headers: { ...(admin ? { Authorization: 'Bearer owner' } : {}), ...init.headers },
  });
  return { status: res.status, body: (await res.json()) as unknown };
};

const ana = { id: 'ana', name: 'Ana' };
const bia = { id: 'bia', name: 'Bia' };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const readGame = async (roomId: string) => {
  let game: GameState | null = null;
  const stop = net.subscribeGame(roomId, (g) => (game = g));
  await wait(150);
  stop();
  return game as GameState | null;
};

beforeAll(async () => {
  const res = await rest('', {}, true).catch(() => null);
  if (!res) throw new Error(`Emulador não encontrado em ${HOST}. Rode: npm run test:emulator`);
});

beforeEach(async () => {
  await rest('', { method: 'DELETE' }, true);
});

describe('regras do banco (firebase-rules.json)', () => {
  it('permite ler salas e nega o resto da raiz', async () => {
    expect((await rest('rooms')).status).toBe(200);
    expect((await rest('')).status).toBe(401);
    expect((await rest('outra', { method: 'PUT', body: '1' })).status).toBe(401);
  });

  it('recusa metadados inválidos, campos extras e códigos de sala estranhos', async () => {
    const put = (path: string, body: unknown) =>
      rest(path, { method: 'PUT', body: JSON.stringify(body) });
    const meta = { name: 'Mesa', status: 'open', maxPlayers: 4, playerCount: 1 };

    expect((await put('rooms/ABC12/meta', meta)).status).toBe(200);
    expect((await put('rooms/ABC12/meta', { ...meta, maxPlayers: 99 })).status).toBe(401);
    expect((await put('rooms/ABC12/meta', { ...meta, status: 'hack' })).status).toBe(401);
    expect((await put('rooms/ABC12/lixo', { a: 1 })).status).toBe(401);
    expect((await put('rooms/abc!/meta', meta)).status).toBe(401);
    expect((await put('rooms/ABC12/presence/ana', 'sim')).status).toBe(401);
    expect((await put('rooms/ABC12/game', { phase: 'lobby' })).status).toBe(401);
  });

  it('permite apagar qualquer sala (limpeza de salas antigas)', async () => {
    await rest('rooms/room-antiga', { method: 'PUT', body: '{"x":1}' }, true);
    expect((await rest('rooms/room-antiga', { method: 'DELETE' })).status).toBe(200);
  });
});

describe('adaptador com o SDK real', () => {
  it('cria sala privada, recusa senha errada e não guarda a senha', async () => {
    const id = await net.createRoom({ name: 'Mesa', maxPlayers: 3 }, ana, 'segredo');
    expect(await net.getRoomInfo(id)).toEqual({ name: 'Mesa', isPrivate: true });
    await expect(net.joinRoom(id, bia, 'errada')).rejects.toMatchObject({ code: 'wrong_password' });
    await net.joinRoom(id, bia, 'segredo');
    expect((await readGame(id))?.players.map((p) => p.id)).toEqual(['ana', 'bia']);
    const dump = await rest(`rooms/${id}`, {}, true);
    expect(JSON.stringify(dump.body)).not.toContain('segredo');
  });

  it('recusa sala cheia e sala inexistente', async () => {
    const id = await net.createRoom({ maxPlayers: 2 }, ana, null);
    await net.joinRoom(id, bia);
    await expect(net.joinRoom(id, { id: 'caio', name: 'Caio' })).rejects.toMatchObject({
      code: 'room_full',
    });
    await expect(net.joinRoom('NAOEX', bia)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('joga uma partida inteira; a lista acompanha o status', async () => {
    const id = await net.createRoom({ maxHandSize: 2, maxPlayers: 3 }, ana, null);
    await net.joinRoom(id, bia);
    let open: net.RoomSummary[] = [];
    const stop = net.subscribeOpenRooms((rooms) => (open = rooms));
    await wait(200);
    expect(open.map((r) => r.id)).toContain(id);

    await net.dispatch(id, { type: 'addBot', by: 'ana' });
    await net.dispatch(id, { type: 'toggleReady', playerId: 'bia' });
    await net.dispatch(id, { type: 'startGame', by: 'ana' });

    for (let step = 0; step < 300; step++) {
      const g = (await readGame(id))!;
      if (g.phase === 'game_over') break;
      let action: GameAction;
      if (isTrickComplete(g)) action = { type: 'resolveTrick' };
      else if (g.phase === 'trick_summary' || g.phase === 'round_end') {
        action = { type: 'ready', playerId: g.players.find((p) => !p.isReady)!.id };
      } else {
        const p = g.players.find((x) => x.id === g.currentTurn)!;
        if (!isAutomated(p))
          await net.dispatch(id, { type: 'setAway', playerId: p.id, away: true });
        action = { type: 'botMove', playerId: p.id };
      }
      await net.dispatch(id, action);
      for (const human of [ana, bia]) await net.dispatch(id, { type: 'join', player: human });
    }

    const end = (await readGame(id))!;
    expect(end.phase).toBe('game_over');
    await wait(200);
    expect(open.map((r) => r.id)).not.toContain(id);
    expect(((await rest(`rooms/${id}/meta/status`, {}, true)).body as string) ?? '').toBe(
      'finished',
    );
    stop();
  }, 60_000);

  it('ação repetida só é aplicada uma vez', async () => {
    const id = await net.createRoom({ maxHandSize: 1 }, ana, null);
    await net.joinRoom(id, bia);
    await net.dispatch(id, { type: 'toggleReady', playerId: 'bia' });
    await net.dispatch(id, { type: 'startGame', by: 'ana' });
    for (let i = 0; i < 4; i++) {
      const g = (await readGame(id))!;
      await net.dispatch(id, { type: 'setAway', playerId: g.currentTurn, away: true });
      await net.dispatch(id, { type: 'botMove', playerId: g.currentTurn });
    }
    const results = await Promise.all([
      net.dispatch(id, { type: 'resolveTrick' }),
      net.dispatch(id, { type: 'resolveTrick' }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('apaga a sala quando o último humano sai e limpa salas abandonadas/antigas', async () => {
    const id = await net.createRoom({}, ana, null);
    await net.leaveRoom(id, 'ana');
    expect((await rest(`rooms/${id}`, {}, true)).body).toBeNull();

    const fresh = await net.createRoom({}, ana, null);
    const old = await net.createRoom({}, bia, null);
    await rest(`rooms/${old}/meta/lastActivity`, { method: 'PUT', body: '1' }, true);
    await rest('rooms/AB12CD', { method: 'PUT', body: '{"currentRoom":{"name":"antiga"}}' }, true);
    expect(await net.cleanupStaleRooms()).toBe(2);
    expect(Object.keys((await rest('rooms', {}, true)).body as object)).toEqual([fresh]);
  });

  it('registra presença', async () => {
    const id = await net.createRoom({}, ana, null);
    let online = new Set<string>();
    const stopPresence = net.subscribePresence(id, (s) => (online = s));
    const stopTracking = net.trackPresence(id, 'ana');
    await wait(300);
    expect([...online]).toEqual(['ana']);
    stopTracking();
    stopPresence();
  });
});
