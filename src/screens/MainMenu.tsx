import { BookOpen, Wifi, WifiOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { MAX_NAME_LENGTH } from '../game/engine';
import { LANGUAGES, useI18n } from '../i18n';
import { playSound } from '../lib/sound';
import { Button } from '../components/ui/Button';

interface MainMenuProps {
  initialName: string;
  onlineAvailable: boolean;
  onlineError: string | null;
  pendingRoomCode: string | null;
  onPlay: (name: string, mode: 'online' | 'offline') => void;
  onTutorial: () => void;
}

export const MainMenu = ({
  initialName,
  onlineAvailable,
  onlineError,
  pendingRoomCode,
  onPlay,
  onTutorial,
}: MainMenuProps) => {
  const { t, lang, setLang } = useI18n();
  const [name, setName] = useState(initialName);
  const valid = name.trim().length > 0;

  const submit = (mode: 'online' | 'offline') => {
    if (!valid) return;
    playSound('bid');
    onPlay(name.trim(), mode);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(onlineAvailable ? 'online' : 'offline');
  };

  return (
    <div className="flex h-full w-full flex-col items-center overflow-y-auto px-4 py-6">
      <div
        className="flex w-full max-w-md justify-end gap-2"
        role="group"
        aria-label={t('language')}
      >
        {LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => setLang(l)}
            className={`h-9 w-12 rounded-lg border-2 text-lg uppercase ${lang === l ? 'border-white bg-balatro-gold text-black' : 'border-slate-600 bg-slate-800 text-slate-400'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl border-4 border-slate-600 bg-balatro-panel p-5 text-center shadow-[8px_8px_0_rgb(0_0_0/0.5)] animate-in zoom-in-95 sm:p-8"
      >
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-balatro-red via-balatro-blue to-balatro-gold" />

        <h1 className="mt-2 text-5xl text-white drop-shadow-[4px_4px_0_#000] sm:text-6xl">
          {t('gameTitle')}
        </h1>
        <p className="mb-6 text-lg tracking-[0.2em] text-balatro-blue">{t('tagline')}</p>

        <label className="sr-only" htmlFor="player-name">
          {t('enterName')}
        </label>
        <input
          id="player-name"
          type="text"
          autoComplete="nickname"
          enterKeyHint="go"
          placeholder={t('enterName')}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border-2 border-slate-500 bg-slate-900 p-3 text-center text-2xl text-white uppercase outline-none focus:border-balatro-gold"
        />

        {pendingRoomCode && onlineAvailable && (
          <p className="mb-3 text-lg text-balatro-gold">{t('codeIs', { code: pendingRoomCode })}</p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!valid || !onlineAvailable}
            icon={<Wifi size={22} />}
            onClick={() => submit('online')}
          >
            {t('playOnline')}
          </Button>
          {!onlineAvailable && (
            <p className="-mt-1 text-base text-red-300">{onlineError ?? t('onlineUnavailable')}</p>
          )}
          <Button
            variant="neutral"
            size="lg"
            block
            disabled={!valid}
            icon={<WifiOff size={22} />}
            onClick={() => submit('offline')}
          >
            {t('playOffline')}
          </Button>
          <Button
            variant="ghost"
            block
            icon={<BookOpen size={20} />}
            onClick={onTutorial}
            className="text-balatro-gold"
          >
            {t('tutorial')}
          </Button>
        </div>
      </form>

      <footer className="pt-4 text-sm text-slate-500">v1.0.0 · Firebase</footer>
    </div>
  );
};
