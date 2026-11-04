// Calcolo della fame dell'alligatore (regola 7). Funzioni pure.

import type { Azione, Evento, StatoAlligatore, TipoEvento } from './types';
import { aggiungiGiorni, chiaveGiorno, daChiaveGiorno, inizioGiorno } from './time';

export const FAME_MIN = 0;
export const FAME_MAX = 10;
export const FAME_INIZIALE = 4;

export type Umore = 'sazio' | 'vigile' | 'affamato' | 'feroce';

export const ETICHETTE_UMORE: Record<Umore, string> = {
  sazio: 'Sazio',
  vigile: 'Vigile',
  affamato: 'Affamato',
  feroce: 'Feroce',
};

export function limitaFame(f: number): number {
  return Math.min(FAME_MAX, Math.max(FAME_MIN, Math.round(f * 2) / 2));
}

/** sazio 0-2, vigile 3-5, affamato 6-8, feroce 9-10 (i mezzi punti vanno giù). */
export function umore(fame: number): Umore {
  if (fame < 3) return 'sazio';
  if (fame < 6) return 'vigile';
  if (fame < 9) return 'affamato';
  return 'feroce';
}

/** Promemoria massimi al giorno secondo l'umore. */
export const MAX_PROMEMORIA: Record<Umore, number> = {
  sazio: 1,
  vigile: 2,
  affamato: 3,
  feroce: 4,
};

export function maxPromemoriaAlGiorno(fame: number): number {
  return MAX_PROMEMORIA[umore(fame)];
}

/**
 * Effetto immediato di un evento sulla fame.
 * fatta -3, non_ancora +0.5, ignorata +1 ogni 2;
 * silenzio, piu_tardi, "la faccio alle..." e notifica: 0.
 */
export function applicaEvento(stato: StatoAlligatore, tipo: TipoEvento): StatoAlligatore {
  switch (tipo) {
    case 'fatta':
      return { ...stato, fame: limitaFame(stato.fame - 3) };
    case 'non_ancora':
      return { ...stato, fame: limitaFame(stato.fame + 0.5) };
    case 'ignorata': {
      const n = stato.ignorateDaContare + 1;
      if (n >= 2) return { ...stato, fame: limitaFame(stato.fame + 1), ignorateDaContare: 0 };
      return { ...stato, ignorateDaContare: n };
    }
    default:
      return stato;
  }
}

/** C'è almeno un'azione attiva o abitudine in scadenza entro la fine di oggi? */
export function ciSonoScadenzeOggi(azioni: Azione[], adesso: number): boolean {
  const fineOggi = aggiungiGiorni(inizioGiorno(adesso), 1);
  return azioni.some(
    (a) => (a.stato === 'attiva' || a.stato === 'abitudine') && !a.inAttesaAbitudine && a.prossimaComparsa < fineOggi,
  );
}

const GIORNI_MEMORIA = 14;

/** Annota che oggi c'era almeno un'azione in scadenza. */
export function annotaScadenzeOggi(stato: StatoAlligatore, azioni: Azione[], adesso: number): StatoAlligatore {
  const oggi = chiaveGiorno(adesso);
  if (stato.giorniInScadenza.includes(oggi) || !ciSonoScadenzeOggi(azioni, adesso)) return stato;
  return { ...stato, giorniInScadenza: [...stato.giorniInScadenza, oggi].slice(-GIORNI_MEMORIA) };
}

/**
 * +1 per ogni giorno passato (fino a ieri, non ancora valutato) in cui c'era
 * almeno un'azione in scadenza e nessuna Fatta.
 *
 * Un giorno era "in scadenza" se è stato annotato mentre il browser era aperto,
 * oppure se un'azione ancora in attesa era già scaduta quel giorno (es. il PC è
 * rimasto spento: l'azione è ancora lì che aspetta).
 */
export function valutaGiorniPassati(
  stato: StatoAlligatore,
  azioni: Azione[],
  eventi: Evento[],
  adesso: number,
): StatoAlligatore {
  const oggi = inizioGiorno(adesso);
  const ieri = aggiungiGiorni(oggi, -1);
  const chiaveIeri = chiaveGiorno(ieri);

  if (!stato.ultimoGiornoValutato) {
    // Prima esecuzione: nessuna penalità retroattiva.
    return { ...stato, ultimoGiornoValutato: chiaveIeri };
  }
  if (stato.ultimoGiornoValutato >= chiaveIeri) return stato;

  const giorniFatta = new Set(eventi.filter((e) => e.tipo === 'fatta').map((e) => chiaveGiorno(e.momento)));
  const annotati = new Set(stato.giorniInScadenza);
  const inAttesa = azioni.filter(
    (a) => (a.stato === 'attiva' || a.stato === 'abitudine') && !a.inAttesaAbitudine,
  );

  let giorno = aggiungiGiorni(daChiaveGiorno(stato.ultimoGiornoValutato), 1);
  // Non più di 30 giorni indietro: oltre non ha senso accumulare.
  const limite = aggiungiGiorni(oggi, -30);
  if (giorno < limite) giorno = limite;

  let fame = stato.fame;
  while (giorno <= ieri) {
    const chiave = chiaveGiorno(giorno);
    const fine = aggiungiGiorni(giorno, 1);
    const inScadenza = annotati.has(chiave) || inAttesa.some((a) => a.prossimaComparsa < fine);
    if (inScadenza && !giorniFatta.has(chiave)) fame += 1;
    giorno = aggiungiGiorni(giorno, 1);
  }

  return {
    ...stato,
    fame: limitaFame(fame),
    ultimoGiornoValutato: chiaveIeri,
    giorniInScadenza: stato.giorniInScadenza.filter((k) => k >= chiaveGiorno(aggiungiGiorni(oggi, -GIORNI_MEMORIA))),
  };
}

/** Giorni di calendario dall'ultima Fatta (0 se oggi o se non c'è storia). */
export function giorniDiDigiuno(eventi: Evento[], adesso: number): number {
  let ultima = -Infinity;
  for (const e of eventi) if (e.tipo === 'fatta' && e.momento > ultima) ultima = e.momento;
  if (ultima === -Infinity) {
    const prima = eventi.reduce((m, e) => Math.min(m, e.momento), Infinity);
    if (prima === Infinity) return 0;
    ultima = prima;
  }
  const diff = inizioGiorno(adesso) - inizioGiorno(ultima);
  return Math.max(0, Math.round(diff / 86_400_000));
}
