import { aggiungiGiorni, inizioGiorno } from '../core/time';

const ora = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const giorno = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

export function formattaOra(ms: number): string {
  return ora.format(ms);
}

/** "oggi alle 20:30", "domani alle 09:00", "venerdì 6 novembre" */
export function formattaQuando(ms: number, adesso: number): string {
  const oggi = inizioGiorno(adesso);
  const domani = aggiungiGiorni(oggi, 1);
  const dopodomani = aggiungiGiorni(oggi, 2);
  const mezzanotte = inizioGiorno(ms) === ms;
  if (ms >= oggi && ms < domani) return mezzanotte ? 'oggi' : `oggi alle ${formattaOra(ms)}`;
  if (ms >= domani && ms < dopodomani) return mezzanotte ? 'domani' : `domani alle ${formattaOra(ms)}`;
  return giorno.format(ms);
}

export function minutiRimasti(fino: number, adesso: number): number {
  return Math.max(0, Math.ceil((fino - adesso) / 60_000));
}
