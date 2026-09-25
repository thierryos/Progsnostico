import { routePath } from './router';

/** Link de convite: https://…/Progsnostico/room/CODIGO */
export const roomLink = (code: string) =>
  new URL(routePath({ name: 'room', code }), window.location.origin).toString();

/** Usa a folha de compartilhamento nativa no celular; no desktop, copia o link. */
export const shareRoom = async (
  code: string,
  text: string,
): Promise<'shared' | 'copied' | 'failed'> => {
  const url = roomLink(code);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Prognóstico', text, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
};
