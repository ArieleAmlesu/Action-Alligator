// Numeri della settimana e revisione della domenica.

import type { Evento, Fonte, StatoAlligatore } from './types';
import { chiaveGiorno, eDomenica, inizioSettimana } from './time';

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
