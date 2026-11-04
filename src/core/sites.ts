// Siti del post-it: normalizzazione e pattern per i permessi.

/**
 * Accetta "youtube.com", "https://www.youtube.com/watch?v=..." ecc.
 * Restituisce il dominio senza "www." oppure null se non valido.
 */
export function normalizzaSito(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z]+:\/\//.test(s)) s = `https://${s}`;
  let host: string;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    host = u.hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '');
  if (!/^([a-z0-9-]+\.)+[a-z0-9-]{2,}$/.test(host)) return null;
  return host;
}

/** Pattern dei permessi per un dominio e i suoi sottodomini. */
export function patternPerSito(dominio: string): string[] {
  return [`*://${dominio}/*`, `*://*.${dominio}/*`];
}

export function patternPerSiti(domini: string[]): string[] {
  return domini.flatMap(patternPerSito);
}
