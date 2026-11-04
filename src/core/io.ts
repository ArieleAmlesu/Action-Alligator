// Esporta e importa tutti i dati in JSON, con validazione rigorosa.

import {
  IMPOSTAZIONI_PREDEFINITE,
  STATO_INIZIALE,
  type Azione,
  type Evento,
  type Fonte,
  type Impostazioni,
  type StatoAlligatore,
} from './types';
import { orarioValido } from './time';
import { limitaFame } from './hunger';

export const SCHEMA = 1;

export interface Dati {
  azioni: Azione[];
  fonti: Fonte[];
  eventi: Evento[];
  impostazioni: Impostazioni;
  stato: StatoAlligatore;
}

export interface FileEsportato extends Dati {
  app: 'action-alligator';
  schema: number;
  esportato: number;
}

export function esporta(d: Dati, adesso: number): FileEsportato {
  return { app: 'action-alligator', schema: SCHEMA, esportato: adesso, ...d };
}

export type EsitoImport = { ok: true; dati: Dati } | { ok: false; errore: string };

const STATI_AZIONE = ['palude', 'attiva', 'abitudine', 'fatta', 'scartata'];
const TIPI_AZIONE = ['singola', 'ricorrente'];
const TIPI_FONTE = ['libro', 'video', 'corso', 'esperienza', 'altro'];
const TIPI_EVENTO = ['fatta', 'non_ancora', 'piu_tardi', 'ignorata', 'notifica', 'silenzio'];

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

class ErroreImport extends Error {}
function richiedi(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ErroreImport(msg);
}

function leggiAzione(x: unknown, i: number): Azione {
  const p = `Azione n. ${i + 1}`;
  richiedi(isObj(x), `${p}: formato non valido`);
  richiedi(isStr(x.id) && x.id, `${p}: id mancante`);
  richiedi(isStr(x.quando) && isStr(x.faro) && isStr(x.versione2min), `${p}: testi mancanti`);
  richiedi(TIPI_AZIONE.includes(x.tipo as string), `${p}: tipo non valido`);
  richiedi(STATI_AZIONE.includes(x.stato as string), `${p}: stato non valido`);
  richiedi(isNum(x.livello) && x.livello >= 0 && x.livello <= 5, `${p}: livello non valido`);
  richiedi(isNum(x.prossimaComparsa) && isNum(x.creata) && isNum(x.aggiornata), `${p}: date non valide`);
  richiedi(isNum(x.nonAncoraDiFila) && x.nonAncoraDiFila >= 0, `${p}: nonAncoraDiFila non valido`);
  richiedi(x.fonteId === undefined || isStr(x.fonteId), `${p}: fonteId non valido`);
  const a: Azione = {
    id: x.id,
    quando: x.quando,
    faro: x.faro,
    versione2min: x.versione2min,
    tipo: x.tipo as Azione['tipo'],
    stato: x.stato as Azione['stato'],
    livello: Math.floor(x.livello),
    prossimaComparsa: x.prossimaComparsa,
    nonAncoraDiFila: Math.floor(x.nonAncoraDiFila),
    creata: x.creata,
    aggiornata: x.aggiornata,
  };
  if (isStr(x.fonteId)) a.fonteId = x.fonteId;
  if (x.inAttesaAbitudine === true) a.inAttesaAbitudine = true;
  return a;
}

function leggiFonte(x: unknown, i: number): Fonte {
  const p = `Fonte n. ${i + 1}`;
  richiedi(isObj(x), `${p}: formato non valido`);
  richiedi(isStr(x.id) && x.id && isStr(x.titolo), `${p}: dati mancanti`);
  richiedi(TIPI_FONTE.includes(x.tipo as string), `${p}: tipo non valido`);
  richiedi(isNum(x.data), `${p}: data non valida`);
  return { id: x.id, titolo: x.titolo, tipo: x.tipo as Fonte['tipo'], data: x.data };
}

function leggiEvento(x: unknown, i: number): Evento {
  const p = `Evento n. ${i + 1}`;
  richiedi(isObj(x), `${p}: formato non valido`);
  richiedi(isStr(x.id) && x.id, `${p}: id mancante`);
  richiedi(TIPI_EVENTO.includes(x.tipo as string), `${p}: tipo non valido`);
  richiedi(isNum(x.momento), `${p}: momento non valido`);
  richiedi(x.azioneId === undefined || isStr(x.azioneId), `${p}: azioneId non valido`);
  const e: Evento = { id: x.id, tipo: x.tipo as Evento['tipo'], momento: x.momento };
  if (isStr(x.azioneId)) e.azioneId = x.azioneId;
  return e;
}

function leggiFinestra(x: unknown, p: string) {
  richiedi(isObj(x) && isStr(x.da) && isStr(x.a) && orarioValido(x.da) && orarioValido(x.a), `${p}: orari non validi`);
  return { da: x.da, a: x.a };
}

function leggiImpostazioni(x: unknown): Impostazioni {
  if (x === undefined) return structuredClone(IMPOSTAZIONI_PREDEFINITE);
  richiedi(isObj(x), 'Impostazioni: formato non valido');
  richiedi(Array.isArray(x.finestreSilenzio), 'Impostazioni: finestre di silenzio mancanti');
  const postit = x.postit;
  richiedi(isObj(postit) && typeof postit.attivo === 'boolean' && Array.isArray(postit.siti) && postit.siti.every(isStr), 'Impostazioni: post-it non valido');
  const fa = isObj(x.orariFaccioAlle) ? x.orariFaccioAlle : IMPOSTAZIONI_PREDEFINITE.orariFaccioAlle;
  richiedi(isStr(fa.stasera) && orarioValido(fa.stasera) && isStr(fa.domani) && orarioValido(fa.domani), 'Impostazioni: orari di "La faccio alle..." non validi');
  const app = isObj(x.appuntamento) ? x.appuntamento : IMPOSTAZIONI_PREDEFINITE.appuntamento;
  richiedi(typeof app.attivo === 'boolean' && isStr(app.ora) && orarioValido(app.ora), 'Impostazioni: appuntamento non valido');
  return {
    appuntamento: { attivo: app.attivo as boolean, ora: app.ora as string },
    finestreSilenzio: x.finestreSilenzio.map((f, i) => leggiFinestra(f, `Finestra di silenzio n. ${i + 1}`)),
    orariAttivi: leggiFinestra(x.orariAttivi, 'Orari attivi'),
    postit: { attivo: postit.attivo as boolean, siti: [...(postit.siti as string[])] },
    orariFaccioAlle: { stasera: fa.stasera as string, domani: fa.domani as string },
  };
}

function leggiStato(x: unknown): StatoAlligatore {
  if (x === undefined) return structuredClone(STATO_INIZIALE);
  richiedi(isObj(x) && isNum(x.fame), 'Stato: fame mancante');
  const s: StatoAlligatore = {
    fame: limitaFame(x.fame),
    ignorateDaContare: isNum(x.ignorateDaContare) ? Math.max(0, Math.floor(x.ignorateDaContare)) : 0,
    giorniInScadenza: Array.isArray(x.giorniInScadenza) ? x.giorniInScadenza.filter(isStr) : [],
  };
  if (isNum(x.silenzioFino)) s.silenzioFino = x.silenzioFino;
  if (isStr(x.ultimoGiornoValutato)) s.ultimoGiornoValutato = x.ultimoGiornoValutato;
  if (isStr(x.revisioneFatta)) s.revisioneFatta = x.revisioneFatta;
  if (isNum(x.ultimoBackup)) s.ultimoBackup = x.ultimoBackup;
  if (isNum(x.backupRimandatoFino)) s.backupRimandatoFino = x.backupRimandatoFino;
  return s;
}

export function importa(testo: string): EsitoImport {
  let json: unknown;
  try {
    json = JSON.parse(testo);
  } catch {
    return { ok: false, errore: 'Il file non è un JSON valido.' };
  }
  try {
    richiedi(isObj(json) && json.app === 'action-alligator', 'Questo file non è un export di Action Alligator.');
    richiedi(isNum(json.schema) && json.schema <= SCHEMA, 'Il file viene da una versione più recente dell\'estensione.');
    richiedi(Array.isArray(json.azioni) && Array.isArray(json.fonti) && Array.isArray(json.eventi), 'Mancano azioni, fonti o eventi.');
    return {
      ok: true,
      dati: {
        azioni: json.azioni.map(leggiAzione),
        fonti: json.fonti.map(leggiFonte),
        eventi: json.eventi.map(leggiEvento),
        impostazioni: leggiImpostazioni(json.impostazioni),
        stato: leggiStato(json.stato),
      },
    };
  } catch (e) {
    if (e instanceof ErroreImport) return { ok: false, errore: e.message };
    throw e;
  }
}
