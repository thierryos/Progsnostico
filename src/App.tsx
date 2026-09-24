import { useCallback, useEffect, useState } from 'react';
import { CrtOverlay } from './components/fx/CrtOverlay';
import { SwirlBackground } from './components/fx/SwirlBackground';
import { SuitIcon } from './components/SuitIcon';
import { PasswordDialog } from './components/ui/PasswordDialog';
import { useNotice } from './components/ui/Notice';
import { createGame } from './game/engine';
import { GameRuleError, type GameState, type RoomSettings } from './game/types';
import { useI18n, type TranslationKey } from './i18n';
import { getPlayerId } from './lib/ids';
import { useSettings } from './lib/settings';
import { consumeRoomParam } from './lib/share';
import { sessionStore, storage } from './lib/storage';
import { loadNet, type Net } from './net';
import { hasFirebaseConfig } from './net/config';
import { OfflineRoom } from './rooms/OfflineRoom';
import { OnlineRoom } from './rooms/OnlineRoom';
import { MainMenu } from './screens/MainMenu';
import { RoomBrowser } from './screens/RoomBrowser';
import { TutorialRoom } from './tutorial/TutorialRoom';

type Screen =
  | { name: 'menu' }
  | { name: 'browser'; mode: 'online' | 'offline' }
  | { name: 'online'; roomId: string }
  | { name: 'offline'; game: GameState }
  | { name: 'tutorial' }
  | { name: 'resuming' };

const NAME_KEY = 'prog.name';
const ROOM_KEY = 'prog.room';

// Lidos uma única vez ao carregar a página.
const localId = getPlayerId();
const inviteCode = consumeRoomParam();

const errorKey = (e: unknown): TranslationKey =>
  e instanceof GameRuleError ? `err_${e.code}` : 'err_generic';

export const App = () => {
  const { t } = useI18n();
  const notify = useNotice();
  const fx = useSettings();
  const [name, setName] = useState(() => storage.get(NAME_KEY) ?? '');
  const [pendingCode, setPendingCode] = useState(inviteCode);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [net, setNet] = useState<Net | null>(null);
  const [busy, setBusy] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{
    room: string;
    resolve: (password: string | null) => void;
  } | null>(null);
  const [screen, setScreen] = useState<Screen>(() =>
    sessionStore.get(ROOM_KEY) && hasFirebaseConfig() ? { name: 'resuming' } : { name: 'menu' },
  );

  const onlineAvailable = hasFirebaseConfig() && !onlineError;
  const needsNet =
    screen.name === 'online' ||
    screen.name === 'resuming' ||
    (screen.name === 'browser' && screen.mode === 'online');

  useEffect(() => {
    if (needsNet && !net) void loadNet().then(setNet);
  }, [needsNet, net]);

  // Cota estourada / permissão negada: volta ao menu e mantém só o modo offline.
  useEffect(
    () =>
      net?.onFatalError((message) => {
        setOnlineError(message);
        sessionStore.remove(ROOM_KEY);
        setScreen((s) => (s.name === 'online' || s.name === 'browser' ? { name: 'menu' } : s));
      }),
    [net],
  );

  const enterRoom = (roomId: string) => {
    sessionStore.set(ROOM_KEY, roomId);
    setScreen({ name: 'online', roomId });
  };

  // Recarregou a página no meio de uma partida online: tenta voltar para a mesma sala.
  useEffect(() => {
    if (screen.name !== 'resuming' || !net) return;
    const roomId = sessionStore.get(ROOM_KEY);
    let alive = true;
    void (async () => {
      const ok = roomId ? await net.resumeRoom(roomId, { id: localId, name: name || '?' }) : false;
      if (!alive) return;
      if (ok && roomId) {
        setScreen({ name: 'online', roomId });
      } else {
        sessionStore.remove(ROOM_KEY);
        setScreen({ name: 'menu' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [screen.name, net, name]);

  const askPassword = (room: string) =>
    new Promise<string | null>((resolve) => setPasswordPrompt({ room, resolve }));

  const join = useCallback(
    async (roomId: string) => {
      if (!net || busy) return;
      setBusy(true);
      try {
        const info = await net.getRoomInfo(roomId);
        if (!info) throw new GameRuleError('not_found');
        const password = info.isPrivate ? await askPassword(info.name) : undefined;
        if (password === null) return;
        await net.joinRoom(roomId, { id: localId, name }, password);
        enterRoom(roomId);
      } catch (e) {
        notify(t(errorKey(e)));
      } finally {
        setBusy(false);
      }
    },
    [net, busy, name, notify, t],
  );

  // Link de convite (?sala=CODIGO): entra direto depois de escolher o nome.
  useEffect(() => {
    if (screen.name === 'browser' && screen.mode === 'online' && net && pendingCode) {
      setPendingCode(null);
      void join(pendingCode);
    }
  }, [screen, net, pendingCode, join]);

  const create = async (settings: RoomSettings, password: string | null) => {
    if (screen.name === 'browser' && screen.mode === 'offline') {
      setScreen({ name: 'offline', game: createGame(settings, { id: localId, name }) });
      return;
    }
    if (!net) return;
    setBusy(true);
    try {
      enterRoom(await net.createRoom(settings, { id: localId, name }, password));
    } catch (e) {
      notify(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const exitOnline = useCallback(
    (notice?: TranslationKey) => {
      sessionStore.remove(ROOM_KEY);
      setScreen({ name: 'browser', mode: 'online' });
      if (notice) notify(t(notice));
    },
    [notify, t],
  );

  const onRoomError = useCallback((key: TranslationKey) => notify(t(key)), [notify, t]);

  const goMenu = useCallback(() => setScreen({ name: 'menu' }), []);

  // O redemoinho só se mexe nos menus; na mesa ele congela para poupar bateria.
  const onMenus = screen.name === 'menu' || screen.name === 'browser' || screen.name === 'resuming';
  const screenKey = screen.name === 'online' ? `online-${screen.roomId}` : screen.name;

  return (
    <div className="felt-bg safe-area relative h-dvh w-full overflow-hidden">
      <SwirlBackground animate={fx.motion && onMenus} />
      {/* Fora do menu principal o redemoinho vira só textura: o conteúdo precisa de contraste. */}
      {screen.name !== 'menu' && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#06110c]/75" />
      )}

      <div key={screenKey} className="relative h-full animate-in fade-in duration-300">
        {screen.name === 'menu' && (
          <MainMenu
            initialName={name}
            onlineAvailable={onlineAvailable}
            onlineError={onlineError}
            pendingRoomCode={pendingCode}
            onTutorial={() => setScreen({ name: 'tutorial' })}
            onPlay={(playerName, mode) => {
              setName(playerName);
              storage.set(NAME_KEY, playerName);
              setScreen({ name: 'browser', mode });
            }}
          />
        )}

        {screen.name === 'browser' && (
          <RoomBrowser
            mode={screen.mode}
            playerName={name}
            net={net}
            busy={busy}
            onBack={goMenu}
            onCreate={create}
            onJoin={join}
          />
        )}

        {screen.name === 'online' && net && (
          <OnlineRoom
            key={screen.roomId}
            net={net}
            roomId={screen.roomId}
            localId={localId}
            onExit={exitOnline}
            onError={onRoomError}
          />
        )}

        {screen.name === 'offline' && (
          <OfflineRoom initial={screen.game} localId={localId} onExit={goMenu} />
        )}

        {screen.name === 'tutorial' && <TutorialRoom onExit={goMenu} />}

        {(screen.name === 'resuming' || (screen.name === 'online' && !net)) && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-2xl text-slate-200">
            <div className="flex gap-3" aria-hidden>
              {(['spades', 'hearts', 'clubs', 'diamonds'] as const).map((suit, i) => (
                <SuitIcon
                  key={suit}
                  suit={suit}
                  size={28}
                  className={`animate-suit-hop ${suit === 'hearts' || suit === 'diamonds' ? 'text-balatro-red' : 'text-white'}`}
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <span>{screen.name === 'resuming' ? t('reconnecting') : t('loading')}</span>
          </div>
        )}
      </div>

      {passwordPrompt && (
        <PasswordDialog
          roomName={passwordPrompt.room}
          onSubmit={(password) => {
            passwordPrompt.resolve(password);
            setPasswordPrompt(null);
          }}
        />
      )}

      {fx.crt && <CrtOverlay />}
    </div>
  );
};
