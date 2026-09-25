import { describe, expect, it } from 'vitest';
import { parseRoute, routePath, type Route } from './router';

/** Prefixo do site (o mesmo `base` do vite.config.ts: /Progsnostico/). */
const B = import.meta.env.BASE_URL;

describe('rotas', () => {
  it('reconhece cada tela', () => {
    expect(parseRoute(B)).toEqual({ name: 'menu' });
    expect(parseRoute(`${B}lobby`)).toEqual({ name: 'lobby' });
    expect(parseRoute(`${B}lobby/`)).toEqual({ name: 'lobby' });
    expect(parseRoute(`${B}offline`)).toEqual({ name: 'offline' });
    expect(parseRoute(`${B}tutorial`)).toEqual({ name: 'tutorial' });
    expect(parseRoute(`${B}room/abc12`)).toEqual({ name: 'room', code: 'ABC12' });
  });

  it('trata endereços estranhos sem quebrar', () => {
    expect(parseRoute(`${B}room`)).toEqual({ name: 'lobby' });
    expect(parseRoute(`${B}room/!!!`)).toEqual({ name: 'lobby' });
    expect(parseRoute(`${B}nao-existe`)).toEqual({ name: 'menu' });
    expect(parseRoute('/outro-site/lobby')).toEqual({ name: 'menu' });
  });

  it('aceita o link antigo ?sala=CODIGO', () => {
    expect(parseRoute(B, '?sala=xy9zk')).toEqual({ name: 'room', code: 'XY9ZK' });
  });

  it('gera o caminho de volta para cada rota', () => {
    const routes: Route[] = [
      { name: 'menu' },
      { name: 'lobby' },
      { name: 'offline' },
      { name: 'tutorial' },
      { name: 'room', code: 'ABC12' },
    ];
    for (const route of routes) expect(parseRoute(routePath(route))).toEqual(route);
    expect(routePath({ name: 'room', code: 'ABC12' })).toBe(`${B}room/ABC12`);
  });
});
