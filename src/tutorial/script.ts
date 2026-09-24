/**
 * Roteiro do tutorial: uma rodada de 3 cartas contra um bot, com jogadas fixas.
 * Tudo passa pelo motor real (`reduce`), então o tutorial ensina exatamente as regras do jogo.
 */
import { createCard, sortHand } from '../game/cards';
import type { GameAction, GameState } from '../game/types';
import type { TranslationKey } from '../i18n';

export const TUTORIAL_ME = 'tut-me';
export const TUTORIAL_BOT = 'tut-bot';

export const createTutorialGame = (myName: string, botName: string): GameState => {
  const trumpCard = createCard('10', 'clubs');
  return {
    phase: 'bidding',
    settings: { name: 'Tutorial', maxPlayers: 2, gameMode: 'up', maxHandSize: 3 },
    players: [
      {
        id: TUTORIAL_BOT,
        name: botName,
        isBot: true,
        isAway: false,
        hand: [createCard('3', 'diamonds'), createCard('5', 'spades'), createCard('2', 'clubs')],
        score: 0,
        currentBid: 1,
        tricksWon: 0,
        isReady: true,
      },
      {
        id: TUTORIAL_ME,
        name: myName,
        isBot: false,
        isAway: false,
        hand: sortHand(
          [createCard('2', 'hearts'), createCard('K', 'spades'), createCard('A', 'diamonds')],
          trumpCard.suit,
        ),
        score: 0,
        currentBid: null,
        tricksWon: 0,
        isReady: false,
      },
    ],
    roundSequence: [3],
    roundIndex: 0,
    startPlayerIndex: 0,
    currentTurn: TUTORIAL_ME,
    currentTrickLeader: TUTORIAL_BOT,
    trumpCard,
    leadSuit: null,
    tableCards: [],
    trickHistory: [],
    trickResult: null,
    roundResults: null,
  };
};

export type TutorialWait =
  { type: 'bid'; amount: number } | { type: 'play'; cardId: string } | { type: 'history' };

export interface TutorialStep {
  text: TranslationKey;
  /** Id do elemento destacado pelo holofote. */
  target?: string;
  /** Ação que o jogador precisa fazer para avançar (sem botão "Próximo"). */
  wait?: TutorialWait;
  /** Carta que o bot joga em resposta à ação do jogador. */
  botReply?: string;
  /** Ações aplicadas ao clicar em "Próximo". */
  onNext?: GameAction[];
  hideRoundSummary?: boolean;
  final?: boolean;
}

const resolve: GameAction[] = [{ type: 'resolveTrick' }];
const ready: GameAction[] = [{ type: 'ready', playerId: TUTORIAL_ME }];

export const TUTORIAL_STEPS: TutorialStep[] = [
  { text: 'tut_welcome' },
  { text: 'tut_cards', target: 'local-hand' },
  { text: 'tut_trump', target: 'trump-card' },
  { text: 'tut_bid_intro', target: 'local-hand' },
  {
    text: 'tut_bid_action',
    target: 'bid-btn-2',
    wait: { type: 'bid', amount: 2 },
    botReply: '3-diamonds',
  },
  { text: 'tut_lead_suit', target: 'table-area' },
  {
    text: 'tut_play_action',
    target: 'card-A-diamonds',
    wait: { type: 'play', cardId: 'A-diamonds' },
  },
  { text: 'tut_explain_1', target: 'table-area', onNext: resolve },
  { text: 'tut_result_1', target: 'trick-summary', onNext: ready },
  { text: 'tut_check_history', target: 'history-btn', wait: { type: 'history' } },
  {
    text: 'tut_trick_2',
    target: 'card-K-spades',
    wait: { type: 'play', cardId: 'K-spades' },
    botReply: '5-spades',
  },
  { text: 'tut_explain_2', target: 'table-area', onNext: resolve },
  { text: 'tut_result_2', target: 'trick-summary', onNext: ready },
  {
    text: 'tut_trick_3',
    target: 'card-2-hearts',
    wait: { type: 'play', cardId: '2-hearts' },
    botReply: '2-clubs',
  },
  { text: 'tut_explain_3', target: 'table-area', onNext: resolve },
  { text: 'tut_result_3', target: 'trick-summary', onNext: ready },
  { text: 'tut_score_math', target: 'round-summary' },
  { text: 'tut_help_hierarchy', target: 'help-btn', hideRoundSummary: true },
  { text: 'tut_end_choice', final: true, hideRoundSummary: true },
];

/** A ação do jogador é a esperada neste passo? */
export const matchesWait = (wait: TutorialWait | undefined, action: GameAction) => {
  if (!wait) return false;
  if (wait.type === 'bid') return action.type === 'bid' && action.amount === wait.amount;
  if (wait.type === 'play') return action.type === 'play' && action.cardId === wait.cardId;
  return false;
};
