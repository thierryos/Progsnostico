import { Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, maxCardsPerPlayer } from '../game/cards';
import { MAX_ROOM_NAME_LENGTH } from '../game/engine';
import type { GameMode, RoomSettings } from '../game/types';
import { useI18n } from '../i18n';
import { Button } from '../components/ui/Button';
import { ModePicker, NumberPicker, Stepper } from '../components/ui/Pickers';

interface CreateRoomFormProps {
  playerName: string;
  allowPrivate: boolean;
  busy: boolean;
  onCreate: (settings: RoomSettings, password: string | null) => void;
}

export const CreateRoomForm = ({
  playerName,
  allowPrivate,
  busy,
  onCreate,
}: CreateRoomFormProps) => {
  const { t } = useI18n();
  const [name, setName] = useState(() => t('defaultRoomName', { name: playerName }));
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [gameMode, setGameMode] = useState<GameMode>('up');
  const [maxHandSize, setMaxHandSize] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const deckMax = maxCardsPerPlayer(maxPlayers);
  const effectiveHand = Math.min(maxHandSize, deckMax);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isPrivate && !password.trim()) {
      setError(t('passwordRequired'));
      return;
    }
    onCreate(
      {
        name: name.trim() || t('defaultRoomName', { name: playerName }),
        maxPlayers,
        gameMode,
        maxHandSize: effectiveHand,
      },
      isPrivate ? password.trim() : null,
    );
  };

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-4">
      <label className="flex flex-col gap-1">
        <span className="text-lg text-slate-400 uppercase">{t('roomName')}</span>
        <input
          type="text"
          value={name}
          maxLength={MAX_ROOM_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border-2 border-slate-600 bg-black p-3 text-xl text-white outline-none focus:border-balatro-gold"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-lg text-slate-400 uppercase">{t('maxPlayers')}</span>
        <NumberPicker
          min={MIN_PLAYERS}
          max={MAX_PLAYERS}
          value={maxPlayers}
          onChange={setMaxPlayers}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-lg text-slate-400 uppercase">{t('cardsPerHand')}</span>
        <Stepper
          value={effectiveHand}
          min={0}
          max={deckMax}
          onChange={setMaxHandSize}
          format={(v) => (v === 0 ? t('maxShort', { n: deckMax }) : String(v))}
        />
        <span className="text-base text-slate-500">
          {t('cardsPerHandHint', { n: deckMax, p: maxPlayers })}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-lg text-slate-400 uppercase">{t('gameMode')}</span>
        <ModePicker value={gameMode} onChange={setGameMode} />
      </div>

      {allowPrivate && (
        <div className="rounded-xl border-2 border-slate-700 bg-black/30 p-3">
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-xl text-white select-none">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="size-6 accent-balatro-gold"
            />
            <Lock size={18} className="text-balatro-gold" /> {t('privateRoom')}
          </label>
          {isPrivate && (
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t('password')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="mt-2 w-full rounded-lg border-2 border-slate-600 bg-black p-3 text-xl text-white outline-none focus:border-balatro-gold"
            />
          )}
        </div>
      )}

      {error && <p className="text-lg text-red-400">{error}</p>}

      <Button type="submit" variant="danger" size="lg" block disabled={busy}>
        {t('createRoom')}
      </Button>
    </form>
  );
};
