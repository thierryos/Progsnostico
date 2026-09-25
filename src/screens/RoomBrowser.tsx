import { ArrowLeft, Lock, LogIn, Plus, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { createCard } from '../game/cards';
import type { RoomSettings } from '../game/types';
import { useI18n } from '../i18n';
import { useBackHandler } from '../lib/back';
import { normalizeRoomCode } from '../lib/ids';
import type { Net } from '../net';
import type { RoomSummary } from '../net/firebase';
import { PlayingCard } from '../components/PlayingCard';
import { Button, IconButton } from '../components/ui/Button';
import { CreateRoomForm } from './CreateRoomForm';

/** Um quadradinho por cadeira: cheio = ocupada. */
const SeatPips = ({ taken, total }: { taken: number; total: number }) => (
  <span className="flex gap-1" aria-hidden>
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        className={`size-2.5 rounded-[2px] ${i < taken ? 'bg-balatro-gold shadow-[0_1px_0_#854d0e]' : 'border border-slate-500'}`}
      />
    ))}
  </span>
);

const EMPTY_FAN = [createCard('7', 'hearts'), createCard('Q', 'spades'), createCard('3', 'clubs')];

const EmptyRooms = ({ title, hint }: { title: string; hint: string }) => (
  <li className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-600 bg-slate-950/50 px-4 py-8 text-center">
    <div className="flex" aria-hidden>
      {EMPTY_FAN.map((card, i) => (
        <PlayingCard
          key={card.id}
          card={card}
          width={44}
          className="-mx-1.5 opacity-80"
          style={{ rotate: `${(i - 1) * 12}deg`, translate: `0 ${i === 1 ? -4 : 2}px` }}
        />
      ))}
    </div>
    <div className="leading-tight">
      <p className="text-2xl text-white">{title}</p>
      <p className="text-lg text-slate-400">{hint}</p>
    </div>
  </li>
);

interface RoomBrowserProps {
  mode: 'online' | 'offline';
  playerName: string;
  net: Net | null;
  busy: boolean;
  onBack: () => void;
  onCreate: (settings: RoomSettings, password: string | null) => void;
  onJoin: (roomId: string) => void;
}

export const RoomBrowser = ({
  mode,
  playerName,
  net,
  busy,
  onBack,
  onCreate,
  onJoin,
}: RoomBrowserProps) => {
  const { t } = useI18n();
  const [view, setView] = useState<'list' | 'create'>(mode === 'offline' ? 'create' : 'list');
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (mode !== 'online' || !net) return;
    void net.cleanupStaleRooms();
    return net.subscribeOpenRooms(setRooms);
  }, [mode, net]);

  useBackHandler(
    () => {
      setView('list');
      return true;
    },
    view === 'create' && mode === 'online',
  );

  const joinByCode = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (normalized) onJoin(normalized);
  };

  const title = view === 'create' || mode === 'offline' ? t('createRoom') : t('rooms');

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b-4 border-slate-800 bg-slate-950/70 px-3 py-3">
        <IconButton
          label={t('back')}
          onClick={() => (view === 'create' && mode === 'online' ? setView('list') : onBack())}
        >
          <ArrowLeft size={20} />
        </IconButton>
        <div className="min-w-0 flex-1 leading-none">
          <h1 className="crt-text text-3xl text-white">{title}</h1>
          <p className="truncate text-lg text-balatro-gold">{playerName}</p>
        </div>
      </header>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {view === 'create' ? (
          <CreateRoomForm
            playerName={playerName}
            allowPrivate={mode === 'online'}
            busy={busy}
            onCreate={onCreate}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <form onSubmit={joinByCode} className="flex gap-2">
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                placeholder={t('roomCode')}
                aria-label={t('joinByCode')}
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
                className="min-w-0 flex-1 rounded-lg border-2 border-slate-600 bg-black px-3 text-2xl tracking-[0.3em] text-white uppercase shadow-[inset_0_3px_0_rgb(0_0_0/0.5)] outline-none placeholder:text-xl placeholder:tracking-normal focus:border-balatro-gold"
              />
              <Button
                type="submit"
                variant="gold"
                disabled={!code || busy}
                icon={<LogIn size={20} />}
              >
                {t('join')}
              </Button>
            </form>

            <ul className="flex flex-col gap-2">
              {rooms === null &&
                [0, 1, 2].map((i) => (
                  <li
                    key={i}
                    aria-label={i === 0 ? t('loadingRooms') : undefined}
                    className="h-[4.5rem] animate-pulse rounded-xl border-2 border-slate-800 bg-slate-900/70"
                  />
                ))}
              {rooms?.length === 0 && <EmptyRooms title={t('noRooms')} hint={t('noRoomsHint')} />}
              {rooms?.map((room) => {
                const full = room.playerCount >= room.maxPlayers;
                return (
                  <li
                    key={room.id}
                    className={`pixel-bevel flex items-center gap-3 rounded-xl border-2 border-l-8 border-slate-700 bg-slate-800/95 p-3 animate-in fade-in slide-in-from-bottom-2 ${room.isPrivate ? 'border-l-balatro-red' : 'border-l-balatro-gold'}`}
                  >
                    <div
                      className={`grid size-11 shrink-0 place-items-center rounded-lg ${room.isPrivate ? 'bg-red-950 text-red-300' : 'bg-green-950 text-green-300'}`}
                    >
                      {room.isPrivate ? <Lock size={20} /> : <Users size={20} />}
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-2xl text-white">{room.name}</div>
                      <div className="flex flex-wrap items-center gap-x-2 text-base text-slate-400">
                        <SeatPips taken={room.playerCount} total={room.maxPlayers} />
                        <span className="sr-only">
                          {t('playersCount', { n: room.playerCount, max: room.maxPlayers })}
                        </span>
                        <span>
                          {room.gameMode === 'up' ? t('modeClassicShort') : t('modePyramidShort')}
                        </span>
                        <span className="tracking-widest text-slate-500">{room.id}</span>
                      </div>
                    </div>
                    <Button
                      variant="gold"
                      size="sm"
                      disabled={full || busy}
                      onClick={() => onJoin(room.id)}
                    >
                      {full ? t('full') : t('join')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {view === 'list' && (
        <footer className="shrink-0 border-t-2 border-slate-800 bg-slate-950/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            variant="primary"
            size="lg"
            block
            icon={<Plus size={22} />}
            onClick={() => setView('create')}
          >
            {t('createRoom')}
          </Button>
        </footer>
      )}
    </div>
  );
};
