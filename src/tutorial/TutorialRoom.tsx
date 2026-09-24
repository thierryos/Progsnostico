import { useCallback, useEffect, useRef, useState } from 'react';
import { reduce } from '../game/engine';
import type { GameAction } from '../game/types';
import { useI18n } from '../i18n';
import { playSound } from '../lib/sound';
import { GameScreen } from '../screens/GameScreen';
import {
  TUTORIAL_BOT,
  TUTORIAL_ME,
  TUTORIAL_STEPS,
  createTutorialGame,
  matchesWait,
} from './script';
import { TutorialOverlay } from './TutorialOverlay';

const BOT_REPLY_MS = 800;
const AFTER_ACTION_MS = 500;

export const TutorialRoom = ({ onExit }: { onExit: () => void }) => {
  const { t } = useI18n();
  const [game, setGame] = useState(() => createTutorialGame(t('tutorialYou'), t('tutorialBot')));
  const [stepIndex, setStepIndex] = useState(0);
  const step = TUTORIAL_STEPS[stepIndex];
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const apply = useCallback((action: GameAction) => setGame((g) => reduce(g, action)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const advance = () => {
    busy.current = false;
    setStepIndex((i) => Math.min(i + 1, TUTORIAL_STEPS.length - 1));
  };

  const next = () => {
    step.onNext?.forEach(apply);
    advance();
  };

  /** Só deixa passar a ação que o passo atual pede; o resto é ignorado. */
  const dispatch = (action: GameAction) => {
    if (busy.current || !matchesWait(step.wait, action)) {
      playSound('flip');
      return;
    }
    busy.current = true;
    apply(action);
    const reply = step.botReply;
    if (reply) {
      later(() => {
        apply({ type: 'play', playerId: TUTORIAL_BOT, cardId: reply });
        advance();
      }, BOT_REPLY_MS);
    } else {
      later(advance, AFTER_ACTION_MS);
    }
  };

  const onHistoryClick = () => {
    if (step.wait?.type === 'history') advance();
  };

  return (
    <>
      <GameScreen
        game={game}
        localId={TUTORIAL_ME}
        mode="tutorial"
        dispatch={dispatch}
        onLeave={onExit}
        tutorial={{ onHistoryClick, hideRoundSummary: Boolean(step.hideRoundSummary) }}
      />
      <TutorialOverlay
        step={step}
        index={stepIndex}
        total={TUTORIAL_STEPS.length}
        onNext={next}
        onExit={onExit}
      />
    </>
  );
};
