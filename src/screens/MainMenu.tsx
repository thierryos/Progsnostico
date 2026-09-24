import { BookOpen, Settings, Wifi, WifiOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { createCard } from '../game/cards';
import { MAX_NAME_LENGTH } from '../game/engine';
import { LANGUAGES, useI18n } from '../i18n';
import { playSound } from '../lib/sound';
import { PlayingCard } from '../components/PlayingCard';
import { SettingsSheet } from '../components/SettingsSheet';
import { Button, IconButton } from '../components/ui/Button';

interface MainMenuProps {
  initialName: string;
  onlineAvailable: boolean;
  onlineError: string | null;
  pendingRoomCode: string | null;
  onPlay: (name: string, mode: 'online' | 'offline') => void;
  onTutorial: () => void;
}

/** Leque decorativo em ordem de força (J < Q < K < A), flutuando atrás do painel. */
const FAN = [
  { card: createCard('J', 'diamonds'), rotate: -21, y: 14 },
  { card: createCard('Q', 'clubs'), rotate: -7, y: 3 },
  { card: createCard('K', 'hearts'), rotate: 7, y: 3 },
  { card: createCard('A', 'spades'), rotate: 21, y: 14 },
];

const CardFan = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-x-0 top-0 flex justify-center short:hidden"
  >
    {FAN.map(({ card, rotate, y }, i) => (
      <div
        key={card.id}
        className="-mx-2 animate-float"
        style={{ animationDelay: `${i * 0.35}s`, marginTop: y }}
      >
        <PlayingCard
          card={card}
          width={66}
          style={{ rotate: `${rotate}deg` }}
          className="shadow-[3px_6px_0_rgb(0_0_0/0.45)]"
        />
      </div>
    ))}
  </div>
);

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
  const [showSettings, setShowSettings] = useState(false);
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
    <div className="flex h-full w-full flex-col items-center overflow-y-auto px-4 py-4">
      <div className="flex w-full max-w-md items-center justify-between short:max-w-2xl">
        <IconButton label={t('settings')} onClick={() => setShowSettings(true)}>
          <Settings size={18} />
        </IconButton>
        <div className="flex gap-2" role="group" aria-label={t('language')}>
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={`h-9 w-12 rounded-lg border-2 text-lg uppercase ${lang === l ? 'border-white bg-balatro-gold text-black' : 'border-slate-600 bg-slate-800/90 text-slate-400'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="relative my-auto w-full max-w-md pt-20 short:max-w-2xl short:pt-2">
        <CardFan />

        <form
          onSubmit={onSubmit}
          className="relative z-10 overflow-hidden rounded-2xl border-4 border-slate-600 bg-balatro-panel/95 p-5 text-center shadow-[8px_8px_0_rgb(0_0_0/0.5)] animate-in zoom-in-95 sm:p-8 short:p-4"
        >
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-balatro-red via-balatro-blue to-balatro-gold" />

          <h1 className="crt-text text-extrude mt-3 animate-bob font-display text-[clamp(3.25rem,16vw,5rem)] leading-[0.9] text-white short:mt-1 short:text-5xl">
            {t('gameTitle')}
          </h1>
          <p className="mt-4 mb-6 text-xl leading-tight text-balance text-sky-300 short:mt-2 short:mb-3">
            {t('tagline')}
          </p>

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
            className="mb-4 w-full rounded-lg border-2 border-slate-500 bg-slate-950 p-3 text-center text-2xl text-white uppercase shadow-[inset_0_3px_0_rgb(0_0_0/0.5)] outline-none focus:border-balatro-gold"
          />

          {pendingRoomCode && onlineAvailable && (
            <p className="mb-3 text-lg text-balatro-gold">
              {t('codeIs', { code: pendingRoomCode })}
            </p>
          )}

          <div className="flex flex-col gap-3 short:grid short:grid-cols-2">
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
              <p className="-mt-1 text-base text-red-300 short:order-last short:col-span-2">
                {onlineError ?? t('onlineUnavailable')}
              </p>
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
              className="text-balatro-gold short:col-span-2"
            >
              {t('tutorial')}
            </Button>
          </div>
        </form>
      </div>

      <footer className="pt-4 text-sm text-slate-400/70">v1.2.0 · Firebase</footer>

      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
    </div>
  );
};
