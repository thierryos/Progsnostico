import { sessionStore } from './storage';

const PLAYER_ID_KEY = 'prog.playerId';
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

const randomString = (alphabet: string, length: number) => {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};

/**
 * Id estável por aba: sobrevive a recarregar a página (para voltar à mesma sala),
 * mas duas abas abertas contam como jogadores diferentes.
 */
export const getPlayerId = () => {
  const saved = sessionStore.get(PLAYER_ID_KEY);
  if (saved) return saved;
  const id = `u-${randomString('abcdefghijklmnopqrstuvwxyz0123456789', 10)}`;
  sessionStore.set(PLAYER_ID_KEY, id);
  return id;
};

export const randomRoomCode = () => randomString(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

export const normalizeRoomCode = (input: string) =>
  input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
