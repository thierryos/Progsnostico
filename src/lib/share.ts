export const ROOM_PARAM = 'sala';

export const roomLink = (code: string) => {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set(ROOM_PARAM, code);
  return url.toString();
};

/** Lê (e remove da barra de endereço) o código de sala de um link de convite. */
export const consumeRoomParam = (): string | null => {
  const url = new URL(window.location.href);
  const code = url.searchParams.get(ROOM_PARAM);
  if (code) {
    url.searchParams.delete(ROOM_PARAM);
    window.history.replaceState(null, '', url.toString());
  }
  return code;
};

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
