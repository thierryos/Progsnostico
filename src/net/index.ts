import { useEffect, useState } from 'react';

export type Net = typeof import('./firebase');

let loading: Promise<Net> | null = null;

/** Carrega o SDK do Firebase só quando o modo online é usado. */
export const loadNet = () => (loading ??= import('./firebase'));

export const useNet = () => {
  const [net, setNet] = useState<Net | null>(null);
  useEffect(() => {
    let alive = true;
    loadNet().then((mod) => alive && setNet(mod));
    return () => {
      alive = false;
    };
  }, []);
  return net;
};
