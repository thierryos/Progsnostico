import { useCallback, useEffect, useRef, useState } from 'react';
import { ScreenFx } from './components/fx/ScreenFx';
import { SwirlBackground } from './components/fx/SwirlBackground';
import { SuitIcon } from './components/SuitIcon';
import { PasswordDialog } from './components/ui/PasswordDialog';
import { useNotice } from './components/ui/Notice';
import { createGame } from './game/engine';
import { GameRuleError, type GameState, type RoomSettings } from './game/types';
import { useI18n, type TranslationKey } from './i18n';
import { runBackHandlers } from './lib/back';
import { getPlayerId } from './lib/ids';
import { currentRoute, navigate, type Route } from './lib/router';
import { useSettings } from './lib/settings';
import { storage } from './lib/storage';
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
  | { name: 'resuming'; roomId: string };

const NAME_KEY = 'prog.name';

const localId = getPlayerId();

const errorKey = (e: unknown): TranslationKey =>
  e instanceof GameRuleError ? `err_${e.code}` : 'err_generic';

/** Endereço de cada tela (a partida offline fica em /offline, junto com a criação). */
const screenRoute = (screen: Screen): Route => {
  switch (screen.name) {
    case 'menu':
      return { name: 'menu' };
    case 'tutorial':
      return { name: 'tutorial' };
    case 'browser':
      return screen.mode === 'online' ? { name: 'lobby' } : { name: 'offline' };
    case 'offline':
      return { name: 'offline' };
    case 'online':
    case 'resuming':
      return { name: 'room', code: screen.roomId };
  }
};

/**
 * Tela para uma rota. Sem nome salvo, tudo que é online/offline começa pelo menu;
 * o código da sala fica pendente e a entrada acontece depois de escolher o nome.
 */
const routeScreen = (
  route: Route,
  hasName: boolean,
  online: boolean,
): { screen: Screen; pendingCode?: string } => {
  switch (route.name) {
    case 'menu':
      return { screen: { name: 'menu' } };
    case 'tutorial':
      return { screen: { name: 'tutorial' } };
    case 'lobby':
      return { screen: hasName && online ? { name: 'browser', mode: 'online' } : { name: 'menu' } };
    case 'offline':
      return { screen: hasName ? { name: 'browser', mode: 'offline' } : { name: 'menu' } };
    case 'room':
      return hasName && online
        ? { screen: { name: 'resuming', roomId: route.code } }
        : { screen: { name: 'menu' }, pendingCode: route.code };
  }
};

export const App = () => {
  const { t } = useI18n();
  const notify = useNotice();
  const fx = useSettings();
  const [name, setName] = useState(() => storage.get(NAME_KEY) ?? '');
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [net, setNet] = useState<Net | null>(null);
  const [busy, setBusy] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{
    room: string;
    resolve: (password: string | null) => void;
  } | null>(null);

  const onlineAvailable = hasFirebaseConfig() && !onlineError;
  const [initial] = useState(() => routeScreen(currentRoute(), Boolean(name), onlineAvailable));
  const [screen, setScreen] = useState<Screen>(initial.screen);
  const [pendingCode, setPendingCode] = useState<string | null>(initial.pendingCode ?? null);
  /** Muda a cada "voltar/avançar" do navegador, para ressincronizar a URL. */
  const [historyTick, setHistoryTick] = useState(0);

  // URL acompanha a tela (push); depois de um "voltar" tratado por um modal, restaura a URL.
  // A 1ª sincronização substitui (limpa links antigos ?sala=). Com um código pendente no
  // menu, o endereço continua /room/CODIGO até a pessoa entrar.
  const firstSync = useRef(true);
  useEffect(() => {
    const route: Route =
      screen.name === 'menu' && pendingCode
        ? { name: 'room', code: pendingCode }
        : screenRoute(screen);
    navigate(route, { replace: firstSync.current });
    firstSync.current = false;
  }, [screen, pendingCode, historyTick]);

  // Botão voltar/avançar do navegador (e o voltar do Android).
  const stateRef = useRef({ name, onlineAvailable });
  useEffect(() => {
    stateRef.current = { name, onlineAvailable };
  }, [name, onlineAvailable]);

  useEffect(() => {
    const onPop = () => {
      if (!runBackHandlers()) {
        const next = routeScreen(
          currentRoute(),
          Boolean(stateRef.current.name),
          stateRef.current.onlineAvailable,
        );
        setScreen(next.screen);
        if (next.pendingCode) setPendingCode(next.pendingCode);
      }
      setHistoryTick((n) => n + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
        setScreen((s) =>
          s.name === 'online' || s.name === 'browser' || s.name === 'resuming'
            ? { name: 'menu' }
            : s,
        );
      }),
    [net],
  );

  // Abriu /room/CODIGO (ou recarregou a página na sala): retoma a cadeira ou entra como novo.
  useEffect(() => {
    if (screen.name !== 'resuming' || !net) return;
    const { roomId } = screen;
    let alive = true;
    void (async () => {
      const ok = await net.resumeRoom(roomId, { id: localId, name });
      if (!alive) return;
      if (ok) {
        setScreen({ name: 'online', roomId });
      } else {
        setScreen({ name: 'browser', mode: 'online' });
        setPendingCode(roomId);
      }
    })();
    return () => {
      alive = false;
    };
  }, [screen, net, name]);

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
        setScreen({ name: 'online', roomId });
      } catch (e) {
        notify(t(errorKey(e)));
      } finally {
        setBusy(false);
      }
    },
    [net, busy, name, notify, t],
  );

  // Link de sala pendente: entra assim que a lista de salas online estiver pronta.
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
      const roomId = await net.createRoom(settings, { id: localId, name }, password);
      setScreen({ name: 'online', roomId });
    } catch (e) {
      notify(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const exitOnline = useCallback(
    (notice?: TranslationKey) => {
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

      <ScreenFx mode={fx.screenFx} />
    </div>
  );
};
