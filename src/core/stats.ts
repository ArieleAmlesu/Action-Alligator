// Numeri della settimana e revisione della domenica.

import type { Azione, Evento, Fonte, StatoAlligatore } from './types';
import { chiaveGiorno, eDomenica, GIORNO, inizioSettimana } from './time';

export interface NumeriSettimana {
  fontiAggiunte: number;
  azioniFatte: number;
}

/** Da lunedì 00:00 a adesso. */
export function numeriSettimana(fonti: Fonte[], eventi: Evento[], adesso: number): NumeriSettimana {
  const da = inizioSettimana(adesso);
  return {
    fontiAggiunte: fonti.filter((f) => f.data >= da && f.data <= adesso).length,
    azioniFatte: eventi.filter((e) => e.tipo === 'fatta' && e.momento >= da && e.momento <= adesso).length,
  };
}

/** La domenica, se la revisione non è ancora stata fatta oggi. */
export function proponiRevisione(stato: StatoAlligatore, adesso: number): boolean {
  return eDomenica(adesso) && stato.revisioneFatta !== chiaveGiorno(adesso);
}

export const GIORNI_TRA_BACKUP = 14;
export const GIORNI_RIMANDO_BACKUP = 3;

/**
 * Serve ricordare di salvare una copia dei dati? Sì se ci sono dati da
 * perdere e l'ultima copia (o, se non ce n'è mai stata una, la prima azione)
 * ha più di 14 giorni, e il promemoria non è stato rimandato.
 */
export function serveBackup(stato: StatoAlligatore, azioni: Azione[], adesso: number): boolean {
  if (azioni.length === 0) return false;
  if (stato.backupRimandatoFino !== undefined && adesso < stato.backupRimandatoFino) return false;
  const riferimento = stato.ultimoBackup ?? Math.min(...azioni.map((a) => a.creata));
  return adesso - riferimento >= GIORNI_TRA_BACKUP * GIORNO;
}
