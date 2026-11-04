// Accesso a browser.storage.local. Unico punto in cui si leggono e scrivono i dati.

import { browser } from 'wxt/browser';
import type { Dati } from '../core/io';
import { IMPOSTAZIONI_PREDEFINITE, STATO_INIZIALE, type Impostazioni } from '../core/types';

/** Dati tecnici del background (non esportati). */
export interface Interno {
  /** Piano dei promemoria casuali di oggi */
  piano?: { giorno: string; inviate: number };
  /** Notifiche mostrate e non ancora cliccate: id -> azione */
  notifiche: Record<string, { azioneId: string; creata: number }>;
}

const MAX_EVENTI = 3000;

export async function leggiDati(): Promise<Dati> {
  const r = await browser.storage.local.get(['azioni', 'fonti', 'eventi', 'impostazioni', 'stato']);
  return {
    azioni: (r.azioni as Dati['azioni']) ?? [],
    fonti: (r.fonti as Dati['fonti']) ?? [],
    eventi: (r.eventi as Dati['eventi']) ?? [],
    impostazioni: completaImpostazioni(r.impostazioni as Partial<Impostazioni> | undefined),
    stato: { ...STATO_INIZIALE, ...((r.stato as Partial<Dati['stato']>) ?? {}) },
  };
}

function completaImpostazioni(i?: Partial<Impostazioni>): Impostazioni {
  return {
    ...structuredClone(IMPOSTAZIONI_PREDEFINITE),
    ...(i ?? {}),
  };
}

export async function scriviDati(parziale: Partial<Dati>): Promise<void> {
  const daScrivere: Record<string, unknown> = { ...parziale };
  if (parziale.eventi && parziale.eventi.length > MAX_EVENTI) {
    daScrivere.eventi = parziale.eventi.slice(-MAX_EVENTI);
  }
  await browser.storage.local.set(daScrivere);
}

export async function leggiInterno(): Promise<Interno> {
  const r = await browser.storage.local.get('interno');
  return { notifiche: {}, ...((r.interno as Partial<Interno>) ?? {}) };
}

export async function scriviInterno(i: Interno): Promise<void> {
  await browser.storage.local.set({ interno: i });
}

/**
 * Esegue le modifiche una alla volta (in questo contesto), così due clic
 * ravvicinati non si sovrascrivono a vicenda.
 */
let coda: Promise<unknown> = Promise.resolve();
export function inCoda<T>(fn: () => Promise<T>): Promise<T> {
  const p = coda.then(fn, fn);
  coda = p.catch(() => undefined);
  return p;
}

export function nuovoId(): string {
  return crypto.randomUUID();
}
