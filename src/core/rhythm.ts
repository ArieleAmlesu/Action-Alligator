// Ritmo e livelli delle azioni. Funzioni pure: ricevono l'azione e "adesso",
// restituiscono una nuova azione senza toccare lo storage.

import { MAX_ATTIVE, type Azione, type TipoAzione } from './types';
import { aggiungiGiorni, alOrario, inizioGiorno, MINUTO, ORA } from './time';

/** Giorni di attesa per livello 0..5 delle azioni ricorrenti. */
export const INTERVALLI_GIORNI = [1, 2, 4, 7, 14, 30] as const;
export const LIVELLO_MAX = 5;
export const RICONTROLLO_ABITUDINE_GIORNI = 30;
export const PIU_TARDI_MS = 2 * ORA;
export const SOGLIA_NON_ANCORA = 3;

export function intervalloPerLivello(livello: number): number {
  const i = Math.max(0, Math.min(LIVELLO_MAX, Math.floor(livello)));
  return INTERVALLI_GIORNI[i];
}

export interface NuovaAzioneInput {
  id: string;
  quando: string;
  faro: string;
  versione2min: string;
  tipo: TipoAzione;
  fonteId?: string;
}

/**
 * Crea un'azione. Diventa attiva se c'è posto (meno di 3 attive), altrimenti
 * finisce in Palude.
 */
export function creaAzione(input: NuovaAzioneInput, attiveAttuali: number, adesso: number): Azione {
  return {
    id: input.id,
    quando: input.quando.trim(),
    faro: input.faro.trim(),
    versione2min: input.versione2min.trim(),
    tipo: input.tipo,
    stato: attiveAttuali < MAX_ATTIVE ? 'attiva' : 'palude',
    livello: 0,
    prossimaComparsa: adesso,
    nonAncoraDiFila: 0,
    ...(input.fonteId ? { fonteId: input.fonteId } : {}),
    creata: adesso,
    aggiornata: adesso,
  };
}

export interface EsitoFatta {
  azione: Azione;
  /** true se bisogna chiedere "È diventata abitudine?" */
  chiediAbitudine: boolean;
}

/** Regole 2 e 3: Fatta. */
export function segnaFatta(a: Azione, adesso: number): EsitoFatta {
  const base = { ...a, nonAncoraDiFila: 0, aggiornata: adesso };

  if (a.tipo === 'singola') {
    return { azione: { ...base, stato: 'fatta' }, chiediAbitudine: false };
  }

  if (a.stato === 'abitudine') {
    return {
      azione: {
        ...base,
        prossimaComparsa: aggiungiGiorni(inizioGiorno(adesso), RICONTROLLO_ABITUDINE_GIORNI),
      },
      chiediAbitudine: false,
    };
  }

  const livello = Math.min(LIVELLO_MAX, a.livello + 1);
  if (livello >= LIVELLO_MAX) {
    // Quinto Fatta: in attesa della risposta. Intanto la rimandiamo come
    // al livello 5, così non ricompare finché non rispondi.
    return {
      azione: {
        ...base,
        livello,
        inAttesaAbitudine: true,
        prossimaComparsa: aggiungiGiorni(inizioGiorno(adesso), intervalloPerLivello(livello)),
      },
      chiediAbitudine: true,
    };
  }
  return {
    azione: {
      ...base,
      livello,
      prossimaComparsa: aggiungiGiorni(inizioGiorno(adesso), intervalloPerLivello(livello)),
    },
    chiediAbitudine: false,
  };
}

/** Risposta a "È diventata abitudine?". */
export function rispondiAbitudine(a: Azione, diventata: boolean, adesso: number): Azione {
  const { inAttesaAbitudine: _ignora, ...resto } = a;
  void _ignora;
  const base: Azione = { ...resto, aggiornata: adesso };
  if (diventata) {
    return {
      ...base,
      stato: 'abitudine',
      livello: LIVELLO_MAX,
      prossimaComparsa: aggiungiGiorni(inizioGiorno(adesso), RICONTROLLO_ABITUDINE_GIORNI),
    };
  }
  return {
    ...base,
    livello: 3,
    prossimaComparsa: aggiungiGiorni(inizioGiorno(adesso), intervalloPerLivello(3)),
  };
}

export interface EsitoNonAncora {
  azione: Azione;
  /** true al terzo "Non ancora" di fila: proponi Rimpicciolisci / Cambia momento / Butta */
  proponiAlternative: boolean;
}

/** Regola 4: Non ancora. Torna domani, livello invariato. */
export function segnaNonAncora(a: Azione, adesso: number): EsitoNonAncora {
  const nonAncoraDiFila = a.nonAncoraDiFila + 1;
  return {
    azione: {
      ...a,
      nonAncoraDiFila,
      prossimaComparsa: aggiungiGiorni(inizioGiorno(adesso), 1),
      aggiornata: adesso,
    },
    proponiAlternative: nonAncoraDiFila >= SOGLIA_NON_ANCORA,
  };
}

/** Regola 6: Più tardi. Ricompare dopo 2 ore. */
export function segnaPiuTardi(a: Azione, adesso: number): Azione {
  return { ...a, prossimaComparsa: adesso + PIU_TARDI_MS, aggiornata: adesso };
}

export type SceltaFaccioAlle = 'tra30' | 'stasera' | 'domani';

/**
 * Regola 5: La faccio alle... Calcola l'orario del promemoria.
 * "stasera" già passato -> tra 30 minuti.
 */
export function orarioFaccioAlle(
  scelta: SceltaFaccioAlle,
  orari: { stasera: string; domani: string },
  adesso: number,
): number {
  if (scelta === 'tra30') return adesso + 30 * MINUTO;
  if (scelta === 'stasera') {
    const t = alOrario(adesso, orari.stasera);
    return t > adesso ? t : adesso + 30 * MINUTO;
  }
  return alOrario(aggiungiGiorni(inizioGiorno(adesso), 1), orari.domani);
}

export function segnaFaccioAlle(a: Azione, quando: number, adesso: number): Azione {
  return { ...a, prossimaComparsa: quando, aggiornata: adesso };
}

/** L'azione è "in scadenza" (da fare adesso)? */
export function inScadenza(a: Azione, adesso: number): boolean {
  return (a.stato === 'attiva' || a.stato === 'abitudine') && !a.inAttesaAbitudine && a.prossimaComparsa <= adesso;
}

export function contaAttive(azioni: Azione[]): number {
  return azioni.filter((a) => a.stato === 'attiva').length;
}

export type EsitoAttivazione =
  | { ok: true; azione: Azione }
  | { ok: false; motivo: 'troppe_attive'; attive: Azione[] };

/** Regola 1: massimo 3 attive. Se sono già 3, bisogna chiuderne una. */
export function attiva(a: Azione, azioni: Azione[], adesso: number): EsitoAttivazione {
  const attive = azioni.filter((x) => x.stato === 'attiva' && x.id !== a.id);
  if (attive.length >= MAX_ATTIVE) return { ok: false, motivo: 'troppe_attive', attive };
  return {
    ok: true,
    azione: { ...a, stato: 'attiva', prossimaComparsa: adesso, nonAncoraDiFila: 0, aggiornata: adesso },
  };
}

export function mandaInPalude(a: Azione, adesso: number): Azione {
  return { ...a, stato: 'palude', aggiornata: adesso };
}

export function butta(a: Azione, adesso: number): Azione {
  return { ...a, stato: 'scartata', aggiornata: adesso };
}

/** "Chiudi" nella revisione: l'azione è conclusa e va nella Pancia. */
export function chiudi(a: Azione, adesso: number): Azione {
  return { ...a, stato: 'fatta', aggiornata: adesso };
}
