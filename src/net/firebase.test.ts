import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAutomated, isTrickComplete } from '../game/engine';
import type { GameAction, GameState } from '../game/types';
import { __fake } from './fake/database';
import * as net from './firebase';

vi.mock('firebase/app', () => import('./fake/app'));
vi.mock('firebase/database', () => import('./fake/database'));
vi.mock('./config', () => ({ firebaseConfig: {}, hasFirebaseConfig: () => true }));

const ana = { id: 'ana', name: 'Ana' };
const bia = { id: 'bia', name: 'Bia' };

const readGame = async (roomId: string) => {
  let game: GameState | null = null;
  const stop = net.subscribeGame(roomId, (g) => (game = g));
  await new Promise((r) => setTimeout(r, 5));
  stop();
  return game as GameState | null;
};

beforeEach(() => __fake.reset());

describe('adaptador do Firebase (banco falso)', () => {
  it('cria sala, entra com senha e recusa senha errada', async () => {
    const id = await net.createRoom({ name: 'Mesa', maxPlayers: 3 }, ana, 'segredo');
    expect(await net.getRoomInfo(id)).toEqual({ name: 'Mesa', isPrivate: true });

    await expect(net.joinRoom(id, bia, 'errada')).rejects.toMatchObject({ code: 'wrong_password' });
    await net.joinRoom(id, bia, 'segredo');

    const game = await readGame(id);
    expect(game?.players.map((p) => p.id)).toEqual(['ana', 'bia']);
    expect(JSON.stringify(__fake.dump())).not.toContain('segredo');
  });

  it('recusa sala cheia e sala inexistente', async () => {
    const id = await net.createRoom({ maxPlayers: 2 }, ana, null);
    await net.joinRoom(id, bia);
    await expect(net.joinRoom(id, { id: 'caio', name: 'Caio' })).rejects.toMatchObject({
      code: 'room_full',
    });
    await expect(net.joinRoom('NAOEX', bia)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('ação repetida por dois clientes só é aplicada uma vez', async () => {
    const id = await net.createRoom({ maxHandSize: 1 }, ana, null);
    await net.joinRoom(id, bia);
    await net.dispatch(id, { type: 'toggleReady', playerId: 'bia' });
    await net.dispatch(id, { type: 'startGame', by: 'ana' });

    // Os dois dão palpite e jogam como bots até a vaza completar.
    for (let i = 0; i < 4; i++) {
      const g = (await readGame(id))!;
      await net.dispatch(id, { type: 'setAway', playerId: g.currentTurn, away: true });
      await net.dispatch(id, { type: 'botMove', playerId: g.currentTurn });
    }
    expect(isTrickComplete((await readGame(id))!)).toBe(true);

    const results = await Promise.all([
      net.dispatch(id, { type: 'resolveTrick' }),
      net.dispatch(id, { type: 'resolveTrick' }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const game = (await readGame(id))!;
    expect(game.players.reduce((s, p) => s + p.tricksWon, 0)).toBe(1);
  });

  it('joga uma partida inteira pelo banco, com o status da sala acompanhando', async () => {
    const id = await net.createRoom({ maxHandSize: 3, maxPlayers: 3 }, ana, null);
    await net.joinRoom(id, bia);
    await net.dispatch(id, { type: 'addBot', by: 'ana' });
    await net.dispatch(id, { type: 'toggleReady', playerId: 'bia' });
    await net.dispatch(id, { type: 'startGame', by: 'ana' });

    let open: net.RoomSummary[] = [];
    const stop = net.subscribeOpenRooms((rooms) => (open = rooms));

    for (let step = 0; step < 500; step++) {
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
      // Humanos "voltam" depois de cada jogada (como o cliente real faz).
      for (const human of [ana, bia]) await net.dispatch(id, { type: 'join', player: human });
    }

    const end = (await readGame(id))!;
    expect(end.phase).toBe('game_over');
    expect(end.roundSequence).toEqual([1, 2, 3]);
    expect(open.map((r) => r.id)).not.toContain(id);
    expect(__fake.dump().rooms[id].meta.status).toBe('finished');
    stop();
  });

  it('lista só salas abertas e apaga a sala quando o último humano sai', async () => {
    const id = await net.createRoom({ name: 'Aberta' }, ana, null);
    let open: net.RoomSummary[] = [];
    const stop = net.subscribeOpenRooms((rooms) => (open = rooms));
    await new Promise((r) => setTimeout(r, 5));
    expect(open.map((r) => r.name)).toEqual(['Aberta']);

    await net.leaveRoom(id, 'ana');
    await new Promise((r) => setTimeout(r, 5));
    expect(open).toEqual([]);
    expect(__fake.dump().rooms).toBeUndefined();
    stop();
  });

  it('limpa salas abandonadas e as do formato antigo', async () => {
    const fresh = await net.createRoom({}, ana, null);
    const old = await net.createRoom({}, bia, null);
    const { set, ref, getDatabase } = await import('./fake/database');
    await set(ref(getDatabase(), `rooms/${old}/meta/lastActivity`), 1);
    await set(ref(getDatabase(), 'rooms/LEGADO'), { currentRoom: { name: 'antiga' } });

    expect(await net.cleanupStaleRooms()).toBe(2);
    expect(Object.keys(__fake.dump().rooms)).toEqual([fresh]);
  });

  it('presença some quando a conexão cai', async () => {
    const id = await net.createRoom({}, ana, null);
    let online = new Set<string>();
    const stopPresence = net.subscribePresence(id, (s) => (online = s));
    const stopTracking = net.trackPresence(id, 'ana');
    await new Promise((r) => setTimeout(r, 5));
    expect([...online]).toEqual(['ana']);

    __fake.disconnectAll();
    await new Promise((r) => setTimeout(r, 5));
    expect(online.size).toBe(0);
    stopTracking();
    stopPresence();
  });
});
