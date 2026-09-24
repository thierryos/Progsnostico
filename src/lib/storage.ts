/**
 * Acesso a localStorage/sessionStorage que nunca lança exceção
 * (modo privado, cookies bloqueados, cota cheia etc.).
 */
const safe = (getArea: () => Storage) => ({
  get(key: string): string | null {
    try {
      return getArea().getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      getArea().setItem(key, value);
    } catch {
      /* armazenamento indisponível: ignora */
    }
  },
  remove(key: string) {
    try {
      getArea().removeItem(key);
    } catch {
      /* armazenamento indisponível: ignora */
    }
  },
});

/** Persiste entre visitas: nome, idioma, volume. */
export const storage = safe(() => window.localStorage);

/** Vale só para esta aba (sobrevive a recarregar): id do jogador e sala atual. */
export const sessionStore = safe(() => window.sessionStorage);
