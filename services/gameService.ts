
import { Card, PlayedCard, Player, RoundResult, Suit } from '../types';
import { RANK_VALUE } from '../constants';

export const isValidMove = (card: Card, hand: Card[], leadSuit: Suit | null): boolean => {
  if (!leadSuit) return true;
  if (card.suit === leadSuit) return true;
  
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  if (hasLeadSuit) return false;

  return true;
};

export const determineTrickWinner = (playedCards: PlayedCard[], trumpCard: Card | null): string => {
  if (playedCards.length === 0) return '';

  const leadCard = playedCards[0].card;
  const leadSuit = leadCard.suit;
  const trumpSuit = trumpCard?.suit;

  let winningCardIndex = 0;
  let highestValue = 0;

  playedCards.forEach((pc, index) => {
    let value = RANK_VALUE[pc.card.rank];
    
    if (pc.card.suit === trumpSuit) {
      value += 1000;
    } else if (pc.card.suit === leadSuit) {
      value += 100;
    } else {
      value = 0;
    }

    if (value > highestValue) {
      highestValue = value;
      winningCardIndex = index;
    }
  });

  return playedCards[winningCardIndex].playerId;
};

export const calculateRoundResults = (players: Player[]): { updatedPlayers: Player[], results: RoundResult[] } => {
  const results: RoundResult[] = [];

  const updatedPlayers = players.map(p => {
    let roundPoints = p.tricksWon;
    
    if (p.currentBid !== null && p.tricksWon === p.currentBid) {
      roundPoints += 5;
    }
    
    const newScore = p.score + roundPoints;

    results.push({
      playerId: p.id,
      playerName: p.name,
      bid: p.currentBid ?? 0,
      won: p.tricksWon,
      scoreDelta: roundPoints,
      totalScore: newScore,
      isLocal: p.isLocal,
      isReady: false
    });

    return {
      ...p,
      score: newScore,
      currentBid: null,
      tricksWon: 0
    };
  });

  return { updatedPlayers, results };
};

export const getBotBid = (hand: Card[], trumpCard: Card | null): number => {
  let estimatedTricks = 0;
  hand.forEach(card => {
    const val = RANK_VALUE[card.rank];
    if (trumpCard && card.suit === trumpCard.suit && val > 10) estimatedTricks++;
    else if (val >= 13) estimatedTricks++;
  });
  return estimatedTricks;
};

export const getBotCardToPlay = (hand: Card[], leadSuit: Suit | null, tableCards: PlayedCard[], trumpCard: Card | null): Card => {
  const validCards = hand.filter(c => isValidMove(c, hand, leadSuit));
  
  if (validCards.length === 0) return hand[0];

  if (!leadSuit) {
    return validCards.sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])[0];
  }

  return validCards[0]; 
};
