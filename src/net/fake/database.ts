/**
 * Realtime Database FALSO, em memória — só para testes e para `npm run dev:fake`.
 *
 * Implementa apenas a parte da API de `firebase/database` usada em `net/firebase.ts`,
 * imitando o comportamento que importa: null/arrays vazios somem, arrays viram objetos,
 * transações abortam com `undefined`, `serverTimestamp()` e consultas por filho.
 * Abas do mesmo navegador compartilham o banco via BroadcastChannel.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Tree = Record<string, any>;
type Listener = { target: Target; cb: (snap: Snapshot) => void };

interface Ref {
  kind: 'ref';
  path: string;
}
interface Constraint {
  type: 'orderByChild' | 'equalTo' | 'endAt';
  value: any;
}
interface Query {
  kind: 'query';
  path: string;
  constraints: Constraint[];
}
type Target = Ref | Query;

const TIMESTAMP = { '.sv': 'timestamp' };

let root: Tree = {};
const listeners = new Set<Listener>();
const disconnectOps = new Map<string, () => void>();

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('fake-rtdb') : null;
(channel as unknown as { unref?: () => void } | null)?.unref?.();

let resolveReady: () => void = () => {};
const ready = new Promise<void>((resolve) => (resolveReady = resolve));
setTimeout(() => resolveReady(), channel ? 150 : 0);

// ---------------------------------------------------------------------------
// Árvore
// ---------------------------------------------------------------------------

const split = (path: string) => path.split('/').filter(Boolean);

/** Normaliza como o RTDB: remove null/vazios, arrays viram objetos, resolve timestamps. */
const normalize = (value: any): any => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return value;
  if (value['.sv'] === 'timestamp') return Date.now();
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value);
  const out: Tree = {};
  for (const [k, v] of entries) {
    const n = normalize(v);
    if (n !== undefined) out[k] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Na leitura, objetos com chaves 0..n-1 voltam como arrays (como o SDK faz). */
const toJs = (value: any): any => {
  if (value === null || value === undefined || typeof value !== 'object') return value ?? null;
  const keys = Object.keys(value);
  const isArray = keys.length > 0 && keys.every((k, i) => k === String(i));
  if (isArray) return keys.map((k) => toJs(value[k]));
  return Object.fromEntries(keys.map((k) => [k, toJs(value[k])]));
};

const read = (path: string): any => {
  let node: any = root;
  for (const key of split(path)) {
    if (node === undefined || node === null || typeof node !== 'object') return undefined;
    node = node[key];
  }
  return node;
};

const writeLocal = (path: string, value: any) => {
  const keys = split(path);
  const normalized = normalize(value);
  if (keys.length === 0) {
    root = normalized ?? {};
  } else {
    let node: Tree = root;
    for (const key of keys.slice(0, -1)) {
      if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
      node = node[key];
    }
    const last = keys[keys.length - 1];
    if (normalized === undefined) delete node[last];
    else node[last] = normalized;
    pruneEmpty(keys);
  }
  notify(path);
  return normalized;
};

const pruneEmpty = (keys: string[]) => {
  for (let depth = keys.length - 1; depth > 0; depth--) {
    const parentPath = keys.slice(0, depth - 1).join('/');
    const parent = parentPath ? read(parentPath) : root;
    const key = keys[depth - 1];
    if (parent && typeof parent[key] === 'object' && Object.keys(parent[key]).length === 0) {
      delete parent[key];
    }
  }
};

const write = (path: string, value: any) => {
  const normalized = writeLocal(path, value);
  channel?.postMessage({ type: 'write', path, value: normalized ?? null });
};

// ---------------------------------------------------------------------------
// Snapshots e consultas
// ---------------------------------------------------------------------------

export interface Snapshot {
  key: string | null;
  val: () => any;
  exists: () => boolean;
  child: (path: string) => Snapshot;
  forEach: (cb: (child: Snapshot) => boolean | void) => void;
}

const makeSnapshot = (path: string, raw: any, orderedKeys?: string[]): Snapshot => {
  const keys = split(path);
  return {
    key: keys.length ? keys[keys.length - 1] : null,
    val: () => toJs(raw),
    exists: () => raw !== undefined && raw !== null,
    child: (childPath) => makeSnapshot(`${path}/${childPath}`, readFrom(raw, childPath)),
    forEach: (cb) => {
      if (!raw || typeof raw !== 'object') return;
      for (const k of orderedKeys ?? Object.keys(raw)) {
        if (cb(makeSnapshot(`${path}/${k}`, raw[k])) === true) break;
      }
    },
  };
};

const readFrom = (node: any, path: string) => {
  for (const key of split(path)) {
    if (!node || typeof node !== 'object') return undefined;
    node = node[key];
  }
  return node;
};

const evaluate = (target: Target): Snapshot => {
  const raw = read(target.path);
  if (target.kind === 'ref') return makeSnapshot(target.path, raw);

  const order = target.constraints.find((c) => c.type === 'orderByChild')?.value as string;
  const equal = target.constraints.find((c) => c.type === 'equalTo');
  const end = target.constraints.find((c) => c.type === 'endAt');
  const children = raw && typeof raw === 'object' ? Object.keys(raw) : [];
  const valueOf = (k: string) => readFrom(raw[k], order);

  const matching = children
    .filter((k) => {
      const v = valueOf(k);
      if (equal && v !== equal.value) return false;
      if (end && v !== undefined && !(typeof v === 'number' && v <= end.value)) return false;
      return true;
    })
    .sort((a, b) => (valueOf(a) ?? -Infinity) - (valueOf(b) ?? -Infinity) || 0);

  const filtered = Object.fromEntries(matching.map((k) => [k, raw[k]]));
  return makeSnapshot(target.path, matching.length ? filtered : undefined, matching);
};

const related = (a: string, b: string) => {
  const x = split(a).join('/');
  const y = split(b).join('/');
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`) || !x || !y;
};

const notify = (path: string) => {
  for (const l of listeners) {
    if (related(l.target.path, path)) {
      queueMicrotask(() => listeners.has(l) && l.cb(evaluate(l.target)));
    }
  }
};

channel?.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data;
  if (msg.type === 'write') writeLocal(msg.path, msg.value);
  if (msg.type === 'hello' && Object.keys(root).length > 0) {
    channel.postMessage({ type: 'snapshot', tree: root });
  }
  if (msg.type === 'snapshot' && Object.keys(root).length === 0) {
    root = msg.tree;
    notify('');
    resolveReady();
  }
});
channel?.postMessage({ type: 'hello' });

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => disconnectOps.forEach((op) => op()));
}

// ---------------------------------------------------------------------------
// API pública (mesmas assinaturas usadas do SDK)
// ---------------------------------------------------------------------------

export type Database = { fake: true };
export type DataSnapshot = Snapshot;
export type { Query };

export const getDatabase = (): Database => ({ fake: true });
export const goOffline = () => {};
export const connectDatabaseEmulator = () => {};
export const serverTimestamp = () => TIMESTAMP;

export const ref = (_db: Database, path = ''): Ref => ({ kind: 'ref', path });
export const orderByChild = (value: string): Constraint => ({ type: 'orderByChild', value });
export const equalTo = (value: any): Constraint => ({ type: 'equalTo', value });
export const endAt = (value: any): Constraint => ({ type: 'endAt', value });
export const query = (r: Ref, ...constraints: Constraint[]): Query => ({
  kind: 'query',
  path: r.path,
  constraints,
});

export const get = async (target: Target) => {
  await ready;
  return evaluate(target);
};

export const set = async (r: Ref, value: any) => {
  await ready;
  write(r.path, value);
};

export const update = async (r: Ref, values: Record<string, any>) => {
  await ready;
  for (const [key, value] of Object.entries(values)) write(`${r.path}/${key}`, value);
};

export const remove = async (r: Ref) => {
  await ready;
  write(r.path, null);
};

export const runTransaction = async (r: Ref, fn: (current: any) => any) => {
  await ready;
  const current = toJs(read(r.path));
  const next = fn(current);
  if (next === undefined) return { committed: false, snapshot: evaluate(r) };
  write(r.path, next);
  return { committed: true, snapshot: evaluate(r) };
};

export const onValue = (
  target: Target,
  callback: (snap: Snapshot) => void,
  _onError?: (e: Error) => void,
  options?: { onlyOnce?: boolean },
) => {
  if (target.path === '.info/connected') {
    queueMicrotask(() => callback(makeSnapshot('.info/connected', true)));
    return () => {};
  }
  const listener: Listener = {
    target,
    cb: (snap) => {
      if (options?.onlyOnce) listeners.delete(listener);
      callback(snap);
    },
  };
  listeners.add(listener);
  void ready.then(() => listeners.has(listener) && listener.cb(evaluate(target)));
  return () => {
    listeners.delete(listener);
  };
};

export const onDisconnect = (r: Ref) => ({
  remove: async () => {
    disconnectOps.set(r.path, () => write(r.path, null));
  },
  set: async (value: any) => {
    disconnectOps.set(r.path, () => write(r.path, value));
  },
  cancel: async () => {
    disconnectOps.delete(r.path);
  },
});

/** Só para testes: limpa o banco e simula a queda de conexão de um cliente. */
export const __fake = {
  reset: () => {
    root = {};
    listeners.clear();
    disconnectOps.clear();
  },
  disconnectAll: () => {
    disconnectOps.forEach((op) => op());
    disconnectOps.clear();
  },
  dump: () => toJs(root),
};
