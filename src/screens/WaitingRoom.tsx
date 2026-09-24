import { ArrowLeft, Bot, Check, Crown, Play, Plus, Share2, Trash2, User } from 'lucide-react';
import { MAX_PLAYERS, MIN_PLAYERS, maxCardsPerPlayer, roundSequence } from '../game/cards';
import { getHostId } from '../game/engine';
import type { GameAction, GameState } from '../game/types';
import { useI18n } from '../i18n';
import { Button, IconButton } from '../components/ui/Button';
import { ModePicker, NumberPicker, Stepper } from '../components/ui/Pickers';

interface WaitingRoomProps {
  game: GameState;
  localId: string;
  roomCode: string | null;
  dispatch: (action: GameAction) => void;
  onLeave: () => void;
  onShare: () => void;
}

export const WaitingRoom = ({
  game,
  localId,
  roomCode,
  dispatch,
  onLeave,
  onShare,
}: WaitingRoomProps) => {
  const { t } = useI18n();
  const hostId = getHostId(game);
  const isHost = hostId === localId;
  const me = game.players.find((p) => p.id === localId);
  const { settings, players } = game;

  const others = players.filter((p) => p.id !== hostId);
  const readyCount = players.filter((p) => p.isReady || p.id === hostId).length;
  const canStart = players.length >= MIN_PLAYERS && others.every((p) => p.isReady);
  const deckMax = maxCardsPerPlayer(Math.max(MIN_PLAYERS, players.length));
  const handLimit = Math.min(settings.maxHandSize, deckMax);
  const totalRounds = roundSequence(
    Math.max(MIN_PLAYERS, players.length),
    settings.gameMode,
    handLimit,
  ).length;

  const update = (patch: Partial<GameState['settings']>) =>
    dispatch({ type: 'updateSettings', by: localId, settings: patch });

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b-4 border-slate-800 bg-slate-950/70 px-3 py-3">
        <IconButton label={t('back')} onClick={onLeave}>
          <ArrowLeft size={20} />
        </IconButton>
        <div className="min-w-0 flex-1 leading-none">
          <h1 className="truncate text-3xl text-white">{settings.name}</h1>
          {roomCode && (
            <p className="text-lg text-slate-400">
              {t('roomCode')}:{' '}
              <span className="tracking-[0.25em] text-balatro-gold">{roomCode}</span>
            </p>
          )}
        </div>
        {roomCode && (
          <Button variant="gold" size="sm" icon={<Share2 size={18} />} onClick={onShare}>
            <span className="hidden sm:inline">{t('invite')}</span>
          </Button>
        )}
      </header>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_24rem] lg:overflow-hidden">
        <section className="p-3 lg:thin-scrollbar lg:overflow-y-auto">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xl tracking-widest text-slate-400 uppercase">
              {t('players')}{' '}
              <span className={canStart ? 'text-green-400' : 'text-yellow-400'}>
                {t('readyCount', { n: readyCount, total: players.length })}
              </span>
            </h2>
            {isHost && players.length < settings.maxPlayers && (
              <Button
                variant="neutral"
                size="sm"
                icon={<Plus size={18} />}
                onClick={() => dispatch({ type: 'addBot', by: localId })}
              >
                {t('addBot')}
              </Button>
            )}
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {players.map((p) => {
              const ready = p.isReady || p.id === hostId;
              return (
                <li
                  key={p.id}
                  className={`flex min-h-16 items-center gap-3 rounded-xl border-2 p-2 animate-in fade-in zoom-in-95 ${ready ? 'border-green-600 bg-green-950/40' : 'border-slate-600 bg-slate-800'}`}
                >
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-full border-2 ${ready ? 'border-green-400 bg-green-700' : 'border-slate-500 bg-slate-700'}`}
                  >
                    {p.isBot ? <Bot size={22} /> : <User size={22} />}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-center gap-1 truncate text-2xl text-white">
                      {p.id === hostId && (
                        <Crown
                          size={16}
                          className="shrink-0 text-balatro-gold"
                          aria-label={t('host')}
                        />
                      )}
                      <span className="truncate">{p.name}</span>
                      {p.id === localId && (
                        <span className="text-base text-slate-400">({t('you')})</span>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-base ${ready ? 'text-green-400' : 'text-slate-500'}`}
                    >
                      {ready ? (
                        <>
                          <Check size={14} /> {t('statusReady')}
                        </>
                      ) : (
                        t('statusWaiting')
                      )}
                    </div>
                  </div>
                  {isHost && p.id !== localId && (
                    <IconButton
                      label={t('kick')}
                      tone="danger"
                      onClick={() => dispatch({ type: 'kick', by: localId, playerId: p.id })}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  )}
                </li>
              );
            })}
            {Array.from({ length: Math.max(0, settings.maxPlayers - players.length) }, (_, i) => (
              <li
                key={`empty-${i}`}
                className="flex min-h-16 items-center justify-center rounded-xl border-2 border-dashed border-slate-700 text-lg text-slate-600 uppercase"
              >
                {t('emptySeat')}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t-4 border-slate-800 p-3 lg:thin-scrollbar lg:overflow-y-auto lg:border-t-0 lg:border-l-4">
          <h2 className="mb-3 text-xl tracking-widest text-balatro-gold uppercase">
            {t('settings')}
          </h2>
          {isHost ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-lg text-slate-400 uppercase">{t('maxPlayers')}</span>
                <NumberPicker
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  value={settings.maxPlayers}
                  disabledBelow={players.length}
                  onChange={(maxPlayers) => update({ maxPlayers })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-lg text-slate-400 uppercase">{t('cardsPerHand')}</span>
                <Stepper
                  value={handLimit}
                  min={0}
                  max={deckMax}
                  onChange={(maxHandSize) => update({ maxHandSize })}
                  format={(v) => (v === 0 ? t('maxShort', { n: deckMax }) : String(v))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-lg text-slate-400 uppercase">{t('gameMode')}</span>
                <ModePicker
                  value={settings.gameMode}
                  onChange={(gameMode) => update({ gameMode })}
                />
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-2 text-lg">
              <dt className="text-slate-400">{t('gameMode')}</dt>
              <dd className="text-white">
                {settings.gameMode === 'up' ? t('modeClassic') : t('modePyramid')}
              </dd>
              <dt className="text-slate-400">{t('cardsPerHand')}</dt>
              <dd className="text-white">
                {handLimit === 0 ? t('maxShort', { n: deckMax }) : handLimit}
              </dd>
              <dt className="text-slate-400">{t('maxPlayers')}</dt>
              <dd className="text-white">{settings.maxPlayers}</dd>
            </dl>
          )}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-lg">
            <span className="text-slate-400 uppercase">{t('totalRounds')}</span>
            <span className="text-2xl text-white">{totalRounds}</span>
          </div>
        </section>
      </div>

      <footer className="flex shrink-0 flex-col gap-2 border-t-2 border-slate-800 bg-slate-950/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
        {isHost ? (
          <>
            {!canStart && (
              <p className="text-center text-lg text-slate-400 sm:mr-auto sm:self-center">
                {players.length < MIN_PLAYERS ? t('needPlayers') : t('needReady')}
              </p>
            )}
            <Button
              variant="danger"
              size="lg"
              disabled={!canStart}
              icon={<Play size={22} fill="currentColor" />}
              onClick={() => dispatch({ type: 'startGame', by: localId })}
              className="sm:min-w-56"
            >
              {t('start')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-center text-lg text-slate-400 sm:mr-auto sm:self-center">
              {t('waitingHost')}
            </p>
            <Button
              variant={me?.isReady ? 'gold' : 'success'}
              size="lg"
              onClick={() => dispatch({ type: 'toggleReady', playerId: localId })}
              className="sm:min-w-56"
            >
              {me?.isReady ? t('notReady') : t('iAmReady')}
            </Button>
          </>
        )}
      </footer>
    </div>
  );
};
