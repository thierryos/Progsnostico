/**
 * Rotas do jogo (History API, sem dependência):
 *   /            menu
 *   /lobby       lista de salas online
 *   /room/CODIGO sala online (link de convite)
 *   /offline     partida contra bots
 *   /tutorial    tutorial
 * No GitHub Pages as rotas funcionam porque o build copia o index.html para 404.html.
 */
import { normalizeRoomCode } from './ids';

export type Route =
  | { name: 'menu' }
  | { name: 'lobby' }
  | { name: 'offline' }
  | { name: 'tutorial' }
  | { name: 'room'; code: string };

const base = () => import.meta.env.BASE_URL ?? '/';

/** Links antigos de convite: `/?sala=CODIGO`. */
export const LEGACY_ROOM_PARAM = 'sala';

export const parseRoute = (pathname: string, search = ''): Route => {
  const legacy = new URLSearchParams(search).get(LEGACY_ROOM_PARAM);
  if (legacy && normalizeRoomCode(legacy)) return { name: 'room', code: normalizeRoomCode(legacy) };

  const prefix = base();
  const path = (pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname)
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
  const [head, arg] = path.split('/');

  switch (head) {
    case 'lobby':
      return { name: 'lobby' };
    case 'offline':
      return { name: 'offline' };
    case 'tutorial':
      return { name: 'tutorial' };
    case 'room': {
      const code = normalizeRoomCode(arg ?? '');
      return code ? { name: 'room', code } : { name: 'lobby' };
    }
    default:
      return { name: 'menu' };
  }
};

export const routePath = (route: Route) => {
  const prefix = base();
  switch (route.name) {
    case 'menu':
      return prefix;
    case 'room':
      return `${prefix}room/${route.code}`;
    default:
      return `${prefix}${route.name}`;
  }
};

export const currentRoute = () => parseRoute(window.location.pathname, window.location.search);

/** Troca a URL sem recarregar. Não faz nada se ela já for a mesma. */
export const navigate = (route: Route, { replace = false } = {}) => {
  const path = routePath(route);
  if (window.location.pathname === path && !window.location.search) return;
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
};
