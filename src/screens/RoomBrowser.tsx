import { ArrowLeft, Lock, LogIn, Plus, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { RoomSettings } from '../game/types';
import { useI18n } from '../i18n';
import { normalizeRoomCode } from '../lib/ids';
import type { Net } from '../net';
import type { RoomSummary } from '../net/firebase';
import { Button, IconButton } from '../components/ui/Button';
import { CreateRoomForm } from './CreateRoomForm';

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
          <h1 className="text-3xl text-white">{title}</h1>
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
                className="min-w-0 flex-1 rounded-lg border-2 border-slate-600 bg-black px-3 text-2xl tracking-[0.3em] text-white uppercase outline-none focus:border-balatro-gold"
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
              {rooms === null && (
                <li className="py-10 text-center text-xl text-slate-500">{t('loadingRooms')}</li>
              )}
              {rooms?.length === 0 && (
                <li className="py-10 text-center text-xl text-slate-500">{t('noRooms')}</li>
              )}
              {rooms?.map((room) => {
                const full = room.playerCount >= room.maxPlayers;
                return (
                  <li
                    key={room.id}
                    className="flex items-center gap-3 rounded-xl border-2 border-slate-700 bg-slate-800 p-3"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-green-900 text-green-300">
                      {room.isPrivate ? <Lock size={20} /> : <Users size={20} />}
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-2xl text-white">{room.name}</div>
                      <div className="text-base text-slate-400">
                        {t('playersCount', { n: room.playerCount, max: room.maxPlayers })} ·{' '}
                        {room.gameMode === 'up' ? t('modeClassicShort') : t('modePyramidShort')} ·{' '}
                        <span className="tracking-widest">{room.id}</span>
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
