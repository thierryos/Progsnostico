import type { GameState, Player } from './types';

/** Jogadores a partir do local, no sentido do jogo (o próximo a jogar vem logo depois). */
export const seatOrder = (players: readonly Player[], localId: string): Player[] => {
  const idx = players.findIndex((p) => p.id === localId);
  if (idx < 0) return [...players];
  return [...players.slice(idx), ...players.slice(0, idx)];
};

/**
 * Quem executa as ações automáticas (bots, resolução de vaza, ausências):
 * o primeiro humano conectado. `online = null` significa modo offline.
 */
export const getAuthorityId = (game: GameState, online: ReadonlySet<string> | null) =>
  game.players.find((p) => !p.isBot && !p.isAway && (online === null || online.has(p.id)))?.id ??
  '';

export const bidsSum = (game: GameState) =>
  game.players.reduce((sum, p) => sum + (p.currentBid ?? 0), 0);

export type BidStatus = 'none' | 'onSpot' | 'busted' | 'seeking';

export const bidStatus = (p: Player): BidStatus => {
  if (p.currentBid === null) return 'none';
  if (p.tricksWon === p.currentBid) return 'onSpot';
  return p.tricksWon > p.currentBid ? 'busted' : 'seeking';
};

export const BID_STATUS_COLOR: Record<BidStatus, string> = {
  none: 'text-white',
  onSpot: 'text-green-400',
  busted: 'text-red-400',
  seeking: 'text-balatro-gold',
};

/** Ranking final; empates recebem a mesma posição. */
export const standings = (players: readonly Player[]) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((p) => ({ player: p, rank: sorted.findIndex((q) => q.score === p.score) + 1 }));
};
