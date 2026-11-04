// Pianificazione dei promemoria. Funzioni pure: il background le usa per
// decidere quando creare gli allarmi e se inviare davvero una notifica.

import { inScadenza } from './rhythm';
import { maxPromemoriaAlGiorno } from './hunger';
import type { Azione, Impostazioni } from './types';
import { aggiungiGiorni, inFinestra, inizioGiorno, MINUTO } from './time';

/** Il momento è in una finestra di silenzio o durante il Silenzio? */
export function inSilenzio(ms: number, imp: Impostazioni, silenzioFino?: number): boolean {
  if (silenzioFino !== undefined && ms < silenzioFino) return true;
  return imp.finestreSilenzio.some((f) => inFinestra(ms, f));
}

/** Momento buono per un promemoria casuale: dentro gli orari attivi e fuori dal silenzio. */
export function orarioPermesso(ms: number, imp: Impostazioni, silenzioFino?: number): boolean {
  return inFinestra(ms, imp.orariAttivi) && !inSilenzio(ms, imp, silenzioFino);
}

export interface OpzioniPiano {
  adesso: number;
  impostazioni: Impostazioni;
  silenzioFino?: number;
  /** Quanti promemoria pianificare */
  quanti: number;
  /** Generatore casuale in [0, 1): iniettabile per i test */
  casuale?: () => number;
  /** Distanza minima desiderata tra due promemoria */
  distanzaMinimaMs?: number;
}

/**
 * Sceglie `quanti` orari casuali da adesso a fine giornata, dentro gli orari
 * attivi e mai in silenzio. Restituisce timestamp ordinati.
 */
export function pianificaGiorno(o: OpzioniPiano): number[] {
  const casuale = o.casuale ?? Math.random;
  const distanza = o.distanzaMinimaMs ?? 60 * MINUTO;
  const fine = aggiungiGiorni(inizioGiorno(o.adesso), 1);
  // Dal minuto pieno successivo ad adesso.
  let t = Math.ceil((o.adesso + 1) / MINUTO) * MINUTO;

  const candidati: number[] = [];
  for (; t < fine; t += MINUTO) {
    if (orarioPermesso(t, o.impostazioni, o.silenzioFino)) candidati.push(t);
  }

  const scelti: number[] = [];
  for (let i = 0; i < o.quanti; i++) {
    let liberi = candidati.filter((c) => scelti.every((s) => Math.abs(s - c) >= distanza));
    if (liberi.length === 0) liberi = candidati.filter((c) => !scelti.includes(c));
    if (liberi.length === 0) break;
    scelti.push(liberi[Math.floor(casuale() * liberi.length)]);
  }
  return scelti.sort((a, b) => a - b);
}

export type StatoIdle = 'active' | 'idle' | 'locked';

export type MotivoBlocco = 'fuori_orario' | 'silenzio' | 'tetto' | 'inattivo' | 'niente_da_ricordare';

export interface ContestoInvio {
  adesso: number;
  impostazioni: Impostazioni;
  silenzioFino?: number;
  fame: number;
  inviateOggi: number;
  statoIdle: StatoIdle;
  azioni: Azione[];
}

export type EsitoInvio = { invia: true; azione: Azione } | { invia: false; motivo: MotivoBlocco };

/** Al momento di un promemoria casuale: va inviato? E per quale azione? */
export function decidiPromemoriaCasuale(c: ContestoInvio): EsitoInvio {
  if (inSilenzio(c.adesso, c.impostazioni, c.silenzioFino)) return { invia: false, motivo: 'silenzio' };
  if (!inFinestra(c.adesso, c.impostazioni.orariAttivi)) return { invia: false, motivo: 'fuori_orario' };
  if (c.inviateOggi >= maxPromemoriaAlGiorno(c.fame)) return { invia: false, motivo: 'tetto' };
  if (c.statoIdle !== 'active') return { invia: false, motivo: 'inattivo' };
  const azione = scegliAzioneDaRicordare(c.azioni, c.adesso);
  if (!azione) return { invia: false, motivo: 'niente_da_ricordare' };
  return { invia: true, azione };
}

/**
 * Al momento di un promemoria chiesto da te ("La faccio alle...", "Più tardi"):
 * non conta nel tetto e ignora gli orari attivi, ma rispetta silenzio e
 * inattività.
 */
export function decidiPromemoriaRichiesto(
  c: Omit<ContestoInvio, 'fame' | 'inviateOggi'>,
  azioneId: string,
): EsitoInvio {
  if (inSilenzio(c.adesso, c.impostazioni, c.silenzioFino)) return { invia: false, motivo: 'silenzio' };
  if (c.statoIdle !== 'active') return { invia: false, motivo: 'inattivo' };
  const azione = c.azioni.find((a) => a.id === azioneId);
  if (!azione || !inScadenza(azione, c.adesso)) return { invia: false, motivo: 'niente_da_ricordare' };
  return { invia: true, azione };
}

/** Primo minuto da `ms` in poi che non sia in silenzio (cerca fino a 48 ore). */
export function prossimoMomentoLibero(ms: number, imp: Impostazioni, silenzioFino?: number): number {
  let t = Math.ceil(ms / MINUTO) * MINUTO;
  const limite = t + 2 * 24 * 60 * MINUTO;
  while (t < limite) {
    if (!inSilenzio(t, imp, silenzioFino)) return t;
    t += MINUTO;
  }
  return ms;
}

/** L'azione più "in ritardo" tra le attive in scadenza, poi le abitudini. */
export function scegliAzioneDaRicordare(azioni: Azione[], adesso: number): Azione | undefined {
  const dovute = azioni.filter((a) => inScadenza(a, adesso));
  const ordina = (l: Azione[]) => [...l].sort((a, b) => a.prossimaComparsa - b.prossimaComparsa);
  return ordina(dovute.filter((a) => a.stato === 'attiva'))[0] ?? ordina(dovute.filter((a) => a.stato === 'abitudine'))[0];
}
