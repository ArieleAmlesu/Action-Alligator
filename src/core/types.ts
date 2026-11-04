// Modello dati di Action Alligator. Tutto vive in browser.storage.local.

export type TipoAzione = 'singola' | 'ricorrente';
export type StatoAzione = 'palude' | 'attiva' | 'abitudine' | 'fatta' | 'scartata';

export interface Azione {
  id: string;
  /** Il momento/innesco: "Quando apro il portatile la mattina" */
  quando: string;
  /** Cosa farò: "scrivo le 3 priorità del giorno" */
  faro: string;
  /** La versione ridotta, da 2 minuti */
  versione2min: string;
  tipo: TipoAzione;
  stato: StatoAzione;
  /** 0-5, usato dalle ricorrenti per il ritmo */
  livello: number;
  /** Timestamp (ms) da cui l'azione è "in scadenza" */
  prossimaComparsa: number;
  nonAncoraDiFila: number;
  fonteId?: string;
  creata: number;
  aggiornata: number;
  /** Al quinto Fatta aspettiamo la risposta a "È diventata abitudine?" */
  inAttesaAbitudine?: boolean;
}

export type TipoFonte = 'libro' | 'video' | 'corso' | 'esperienza' | 'altro';

export interface Fonte {
  id: string;
  titolo: string;
  tipo: TipoFonte;
  /** Timestamp (ms) */
  data: number;
}

export type TipoEvento = 'fatta' | 'non_ancora' | 'piu_tardi' | 'ignorata' | 'notifica' | 'silenzio';

export interface Evento {
  id: string;
  azioneId?: string;
  tipo: TipoEvento;
  /** Timestamp (ms) */
  momento: number;
}

/** Orario nel formato "HH:MM" */
export type Orario = string;

export interface Finestra {
  da: Orario;
  a: Orario;
}

export interface Impostazioni {
  finestreSilenzio: Finestra[];
  orariAttivi: Finestra;
  postit: { attivo: boolean; siti: string[] };
  /** Orari usati da "La faccio alle..." */
  orariFaccioAlle: { stasera: Orario; domani: Orario };
  /** Appuntamento fisso: ogni giorno a quest'ora arriva il promemoria del giorno */
  appuntamento: { attivo: boolean; ora: Orario };
}

export interface StatoAlligatore {
  /** 0-10, parte da 4 */
  fame: number;
  /** Timestamp (ms) fino a cui vale il Silenzio */
  silenzioFino?: number;
  /** Promemoria ignorati non ancora convertiti in fame (ogni 2 -> +1) */
  ignorateDaContare: number;
  /** Ultimo giorno (AAAA-MM-GG) già valutato per la fame giornaliera */
  ultimoGiornoValutato?: string;
  /** Giorni (AAAA-MM-GG) in cui c'era almeno un'azione in scadenza */
  giorniInScadenza: string[];
  /** Domenica (AAAA-MM-GG) in cui la revisione è stata fatta o saltata */
  revisioneFatta?: string;
  /** Ultima volta (ms) in cui hai esportato i dati */
  ultimoBackup?: number;
  /** Fino a quando (ms) non riproporre il promemoria di backup */
  backupRimandatoFino?: number;
}

export const MAX_ATTIVE = 3;

export const IMPOSTAZIONI_PREDEFINITE: Impostazioni = {
  finestreSilenzio: [{ da: '22:30', a: '07:30' }],
  orariAttivi: { da: '09:00', a: '21:00' },
  postit: { attivo: false, siti: [] },
  orariFaccioAlle: { stasera: '20:30', domani: '09:00' },
  appuntamento: { attivo: true, ora: '18:00' },
};

export const STATO_INIZIALE: StatoAlligatore = {
  fame: 4,
  ignorateDaContare: 0,
  giorniInScadenza: [],
};
