import { describe, expect, it } from 'vitest';
import { createGame, reduce } from '../game/engine';
import type { GameState } from '../game/types';
import { deserializeGame, serializeGame } from './serialize';

/** Imita o que o Realtime Database faz: some com null/[] e às vezes troca arrays por objetos. */
const throughRtdb = (value: unknown, arraysAsObjects = false): unknown => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const items = value.map((v) => throughRtdb(v, arraysAsObjects));
    if (items.length === 0) return undefined;
    return arraysAsObjects ? Object.fromEntries(items.map((v, i) => [String(i), v])) : items;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([k, v]) => [k, throughRtdb(v, arraysAsObjects)] as const)
      .filter(([, v]) => v !== undefined);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  return value;
};

const inProgress = (): GameState => {
  let state = createGame({ maxHandSize: 3 }, { id: 'a', name: 'Ana' });
  state = reduce(state, { type: 'addBot', by: 'a' });
  state = reduce(state, { type: 'addBot', by: 'a' });
  state = reduce(state, { type: 'startGame', by: 'a' });
  return state;
};

describe('serialização para o Firebase', () => {
  it('sobrevive a nulls e arrays vazios removidos', () => {
    const state = inProgress();
    const raw = throughRtdb(serializeGame(state));
    expect(deserializeGame(raw)).toEqual(state);
  });

  it('aceita arrays que voltam como objetos', () => {
    const state = inProgress();
    const raw = throughRtdb(serializeGame(state), true);
    expect(deserializeGame(raw)).toEqual(state);
  });

  it('descarta dados inválidos', () => {
    expect(deserializeGame(null)).toBeNull();
    expect(deserializeGame({ phase: 'banana' })).toBeNull();
    const state = deserializeGame({ phase: 'lobby', players: { 0: { name: 'sem id' } } });
    expect(state?.players).toEqual([]);
  });
});
