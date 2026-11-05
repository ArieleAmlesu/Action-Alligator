// Pianificazione dei promemoria. Funzioni pure: il background le usa per
// decidere quando creare gli allarmi e se inviare davvero una notifica.

import { inScadenza } from './rhythm';
import { maxPromemoriaAlGiorno } from './hunger';
import type { Azione, Impostazioni } from './types';
import { aggiungiGiorni, alOrario, chiaveGiorno, inFinestra, inizioGiorno, MINUTO, ORA } from './time';

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
  /** Orari già occupati (es. l'appuntamento fisso): i casuali ne stanno lontani */
  occupati?: number[];
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

  const occupati = o.occupati ?? [];
  const scelti: number[] = [];
  for (let i = 0; i < o.quanti; i++) {
    let liberi = candidati.filter((c) => [...scelti, ...occupati].every((s) => Math.abs(s - c) >= distanza));
    if (liberi.length === 0) liberi = candidati.filter((c) => scelti.every((s) => Math.abs(s - c) >= distanza));
    if (liberi.length === 0) liberi = candidati.filter((c) => !scelti.includes(c));
    if (liberi.length === 0) break;
    scelti.push(liberi[Math.floor(casuale() * liberi.length)] ?? liberi[0]!);
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

// --- Appuntamento fisso (es. ogni giorno alle 18:00) ---

/** Se a quell'ora il computer era spento, l'appuntamento si recupera entro 4 ore (e mai il giorno dopo). */
export const RECUPERO_APPUNTAMENTO_MS = 4 * ORA;

export function orarioAppuntamento(giornoMs: number, imp: Impostazioni): number {
  return alOrario(giornoMs, imp.appuntamento.ora);
}

/** Fine della finestra in cui l'appuntamento di oggi può ancora arrivare. */
export function fineRecuperoAppuntamento(adesso: number, imp: Impostazioni): number {
  const mezzanotte = aggiungiGiorni(inizioGiorno(adesso), 1);
  return Math.min(orarioAppuntamento(adesso, imp) + RECUPERO_APPUNTAMENTO_MS, mezzanotte);
}

/** L'appuntamento di oggi è ancora da fare (attivo, non già fatto, non scaduto)? */
export function appuntamentoInSospeso(adesso: number, imp: Impostazioni, fattoIl?: string): boolean {
  return imp.appuntamento.attivo && fattoIl !== chiaveGiorno(adesso) && adesso < fineRecuperoAppuntamento(adesso, imp);
}

/** Quando programmare il prossimo allarme dell'appuntamento. */
export function prossimoAppuntamento(adesso: number, imp: Impostazioni, fattoIl?: string): number | undefined {
  if (!imp.appuntamento.attivo) return undefined;
  const oggi = orarioAppuntamento(adesso, imp);
  if (fattoIl !== chiaveGiorno(adesso) && adesso < oggi) return oggi;
  return orarioAppuntamento(aggiungiGiorni(inizioGiorno(adesso), 1), imp);
}

/** Quanti promemoria casuali restano oggi: l'appuntamento in sospeso ne occupa uno. */
export function quantiCasuali(fame: number, inviateOggi: number, appuntamentoDaFare: boolean): number {
  return Math.max(0, maxPromemoriaAlGiorno(fame) - inviateOggi - (appuntamentoDaFare ? 1 : 0));
}

export type EsitoAppuntamento =
  | { invia: true; azione: Azione }
  | { invia: false; motivo: 'disattivato' | 'gia_fatto' | 'presto' | 'scaduto' | 'silenzio' | 'inattivo' | 'niente_da_ricordare' };

export interface ContestoAppuntamento {
  adesso: number;
  impostazioni: Impostazioni;
  silenzioFino?: number;
  statoIdle: StatoIdle;
  azioni: Azione[];
  /** Giorno (AAAA-MM-GG) in cui l'appuntamento è già stato fatto */
  fattoIl?: string;
}

/**
 * L'appuntamento fisso: non dipende dagli orari attivi né dal tetto (l'hai
 * scelto tu), ma rispetta silenzio e presenza. Se a quell'ora non c'eri,
 * arriva appena torni, purché entro la finestra di recupero.
 */
export function decidiAppuntamento(c: ContestoAppuntamento): EsitoAppuntamento {
  const imp = c.impostazioni;
  if (!imp.appuntamento.attivo) return { invia: false, motivo: 'disattivato' };
  if (c.fattoIl === chiaveGiorno(c.adesso)) return { invia: false, motivo: 'gia_fatto' };
  if (c.adesso < orarioAppuntamento(c.adesso, imp)) return { invia: false, motivo: 'presto' };
  if (c.adesso >= fineRecuperoAppuntamento(c.adesso, imp)) return { invia: false, motivo: 'scaduto' };
  if (inSilenzio(c.adesso, imp, c.silenzioFino)) return { invia: false, motivo: 'silenzio' };
  if (c.statoIdle !== 'active') return { invia: false, motivo: 'inattivo' };
  const azione = scegliAzioneDaRicordare(c.azioni, c.adesso);
  if (!azione) return { invia: false, motivo: 'niente_da_ricordare' };
  return { invia: true, azione };
}
