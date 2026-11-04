// Allarmi e notifiche. Qui la logica pura di src/core incontra le API di Firefox.

import { browser } from 'wxt/browser';
import { annotaScadenzeOggi, applicaEvento, giorniDiDigiuno, maxPromemoriaAlGiorno, umore, valutaGiorniPassati } from '../core/hunger';
import { componiMessaggio } from '../core/messages';
import {
  decidiPromemoriaCasuale,
  decidiPromemoriaRichiesto,
  orarioPermesso,
  pianificaGiorno,
  prossimoMomentoLibero,
} from '../core/scheduler';
import { numeriSettimana } from '../core/stats';
import { chiaveGiorno, MINUTO, ORA } from '../core/time';
import type { Azione, Evento } from '../core/types';
import { inCoda, leggiDati, leggiInterno, nuovoId, scriviDati, scriviInterno } from './storage';

export const ALLARME_BATTITO = 'battito';
const PREFISSO_CASUALE = 'casuale:';
const PREFISSO_RICHIESTO = 'promemoria:';
const PREFISSO_IGNORA = 'ignora:';
const PREFISSO_NOTIFICA = 'aa:';

export const MINUTI_PER_IGNORATA = 30;

/** Allarme periodico: ogni 30 minuti ricontrolla giorno, fame e piano. */
export async function assicuraBattito(): Promise<void> {
  const esistente = await browser.alarms.get(ALLARME_BATTITO);
  if (!esistente) await browser.alarms.create(ALLARME_BATTITO, { periodInMinutes: 30, delayInMinutes: 1 });
}

/** Controllo periodico: fame giornaliera, giorni in scadenza, piano di oggi. */
export function battito(adesso = Date.now()): Promise<void> {
  return inCoda(async () => {
    const dati = await leggiDati();
    let stato = valutaGiorniPassati(dati.stato, dati.azioni, dati.eventi, adesso);
    stato = annotaScadenzeOggi(stato, dati.azioni, adesso);
    if (stato.silenzioFino !== undefined && stato.silenzioFino <= adesso) delete stato.silenzioFino;
    if (JSON.stringify(stato) !== JSON.stringify(dati.stato)) await scriviDati({ stato });

    // Notifiche scadute il cui allarme si fosse perso (es. Firefox chiuso).
    const interno = await leggiInterno();
    for (const [id, n] of Object.entries(interno.notifiche)) {
      if (adesso - n.creata >= MINUTI_PER_IGNORATA * MINUTO) await segnaIgnorataInterna(id, adesso);
    }

    const i2 = await leggiInterno();
    if (i2.piano?.giorno !== chiaveGiorno(adesso)) await pianificaOggiInterna(adesso, false);
  });
}

/** Ripianifica i promemoria casuali che restano oggi (es. dopo aver cambiato le impostazioni). */
export function ripianificaOggi(adesso = Date.now()): Promise<void> {
  return inCoda(() => pianificaOggiInterna(adesso, true));
}

async function pianificaOggiInterna(adesso: number, mantieniConteggio: boolean): Promise<void> {
  const dati = await leggiDati();
  const interno = await leggiInterno();
  const oggi = chiaveGiorno(adesso);
  const inviate = mantieniConteggio && interno.piano?.giorno === oggi ? interno.piano.inviate : 0;

  const tutti = await browser.alarms.getAll();
  await Promise.all(tutti.filter((a) => a.name.startsWith(PREFISSO_CASUALE)).map((a) => browser.alarms.clear(a.name)));

  const quanti = Math.max(0, maxPromemoriaAlGiorno(dati.stato.fame) - inviate);
  const orari = pianificaGiorno({
    adesso,
    impostazioni: dati.impostazioni,
    silenzioFino: dati.stato.silenzioFino,
    quanti,
  });
  for (const t of orari) await browser.alarms.create(`${PREFISSO_CASUALE}${t}`, { when: t });

  await scriviInterno({ ...interno, piano: { giorno: oggi, inviate } });
}

/** Crea (o sposta) il promemoria chiesto per un'azione: "La faccio alle..." o "Più tardi". */
export async function programmaPromemoriaRichiesto(azioneId: string, quando: number): Promise<void> {
  await browser.alarms.create(`${PREFISSO_RICHIESTO}${azioneId}`, { when: quando });
}

export async function annullaPromemoriaRichiesto(azioneId: string): Promise<void> {
  await browser.alarms.clear(`${PREFISSO_RICHIESTO}${azioneId}`);
}

async function statoIdle(): Promise<'active' | 'idle' | 'locked'> {
  try {
    return await browser.idle.queryState(60);
  } catch {
    return 'active';
  }
}

export function gestisciAllarme(nome: string, adesso = Date.now()): Promise<void> {
  if (nome === ALLARME_BATTITO) return battito(adesso);
  return inCoda(async () => {
    if (nome.startsWith(PREFISSO_IGNORA)) {
      await segnaIgnorataInterna(nome.slice(PREFISSO_IGNORA.length), adesso);
    } else if (nome.startsWith(PREFISSO_CASUALE)) {
      await promemoriaCasuale(adesso);
    } else if (nome.startsWith(PREFISSO_RICHIESTO)) {
      await promemoriaRichiesto(nome.slice(PREFISSO_RICHIESTO.length), adesso);
    }
  });
}

async function promemoriaCasuale(adesso: number): Promise<void> {
  const dati = await leggiDati();
  const interno = await leggiInterno();
  const oggi = chiaveGiorno(adesso);
  const inviateOggi = interno.piano?.giorno === oggi ? interno.piano.inviate : 0;

  const esito = decidiPromemoriaCasuale({
    adesso,
    impostazioni: dati.impostazioni,
    silenzioFino: dati.stato.silenzioFino,
    fame: dati.stato.fame,
    inviateOggi,
    statoIdle: await statoIdle(),
    azioni: dati.azioni,
  });

  if (!esito.invia) {
    // Bloccato dal Silenzio di 45 minuti: riprova 5 minuti dopo, se l'orario è ancora buono.
    const fine = dati.stato.silenzioFino;
    if (esito.motivo === 'silenzio' && fine !== undefined && fine > adesso) {
      const t = fine + 5 * MINUTO;
      if (chiaveGiorno(t) === oggi && orarioPermesso(t, dati.impostazioni)) {
        await browser.alarms.create(`${PREFISSO_CASUALE}${t}`, { when: t });
      }
    }
    return;
  }

  await inviaNotifica(esito.azione, adesso);
  const i2 = await leggiInterno();
  await scriviInterno({ ...i2, piano: { giorno: oggi, inviate: inviateOggi + 1 } });
}

async function promemoriaRichiesto(azioneId: string, adesso: number): Promise<void> {
  const dati = await leggiDati();
  const esito = decidiPromemoriaRichiesto(
    {
      adesso,
      impostazioni: dati.impostazioni,
      silenzioFino: dati.stato.silenzioFino,
      statoIdle: await statoIdle(),
      azioni: dati.azioni,
    },
    azioneId,
  );
  if (esito.invia) {
    await inviaNotifica(esito.azione, adesso);
    return;
  }
  if (esito.motivo === 'silenzio') {
    const t = prossimoMomentoLibero(adesso, dati.impostazioni, dati.stato.silenzioFino);
    if (t > adesso) await programmaPromemoriaRichiesto(azioneId, t);
  } else if (esito.motivo === 'inattivo') {
    // Non sei al computer: riprova tra 10 minuti, per al massimo 3 ore.
    const azione = dati.azioni.find((a) => a.id === azioneId);
    if (azione && adesso - azione.prossimaComparsa < 3 * ORA) {
      await programmaPromemoriaRichiesto(azioneId, adesso + 10 * MINUTO);
    }
  }
}

async function inviaNotifica(azione: Azione, adesso: number): Promise<void> {
  const dati = await leggiDati();
  const u = umore(dati.stato.fame);
  const messaggio = componiMessaggio(u, {
    azione: azione.faro,
    giorni: giorniDiDigiuno(dati.eventi, adesso),
    volte: u === 'sazio' ? numeriSettimana(dati.fonti, dati.eventi, adesso).azioniFatte : azione.nonAncoraDiFila,
  });

  const id = `${PREFISSO_NOTIFICA}${nuovoId()}`;
  // Firefox non supporta i pulsanti nelle notifiche: il clic apre la Tana.
  await browser.notifications.create(id, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon/128.png'),
    title: 'Action Alligator',
    message: messaggio,
  });

  const evento: Evento = { id: nuovoId(), azioneId: azione.id, tipo: 'notifica', momento: adesso };
  await scriviDati({ eventi: [...dati.eventi, evento] });

  const interno = await leggiInterno();
  interno.notifiche[id] = { azioneId: azione.id, creata: adesso };
  await scriviInterno(interno);
  await browser.alarms.create(`${PREFISSO_IGNORA}${id}`, { when: adesso + MINUTI_PER_IGNORATA * MINUTO });
}

async function segnaIgnorataInterna(notificaId: string, adesso: number): Promise<void> {
  const interno = await leggiInterno();
  const n = interno.notifiche[notificaId];
  if (!n) return;
  delete interno.notifiche[notificaId];
  await scriviInterno(interno);
  await browser.alarms.clear(`${PREFISSO_IGNORA}${notificaId}`);
  await browser.notifications.clear(notificaId).catch(() => undefined);

  const dati = await leggiDati();
  const evento: Evento = { id: nuovoId(), azioneId: n.azioneId, tipo: 'ignorata', momento: adesso };
  await scriviDati({ eventi: [...dati.eventi, evento], stato: applicaEvento(dati.stato, 'ignorata') });
}

/** Clic sulla notifica: apre la Tana con l'azione evidenziata. */
export function notificaCliccata(notificaId: string): Promise<void> {
  return inCoda(async () => {
    const interno = await leggiInterno();
    const n = interno.notifiche[notificaId];
    if (n) {
      delete interno.notifiche[notificaId];
      await scriviInterno(interno);
    }
    await browser.alarms.clear(`${PREFISSO_IGNORA}${notificaId}`);
    await browser.notifications.clear(notificaId).catch(() => undefined);
    await apriTana(n?.azioneId);
  });
}

/** Notifica chiusa: se l'hai chiusa tu, conta subito come ignorata. */
export function notificaChiusa(notificaId: string, dallUtente: boolean, adesso = Date.now()): Promise<void> {
  if (!dallUtente) return Promise.resolve(); // sparita da sola: ci pensa l'allarme dei 30 minuti
  return inCoda(() => segnaIgnorataInterna(notificaId, adesso));
}

/** Hai agito sull'azione dalla Tana: le sue notifiche aperte non contano come ignorate. */
export async function chiudiNotifichePer(azioneId: string): Promise<void> {
  const interno = await leggiInterno();
  const ids = Object.entries(interno.notifiche)
    .filter(([, n]) => n.azioneId === azioneId)
    .map(([id]) => id);
  if (ids.length === 0) return;
  for (const id of ids) {
    delete interno.notifiche[id];
    await browser.alarms.clear(`${PREFISSO_IGNORA}${id}`);
    await browser.notifications.clear(id).catch(() => undefined);
  }
  await scriviInterno(interno);
}

export async function apriTana(azioneId?: string): Promise<void> {
  const url = browser.runtime.getURL(`/newtab.html${azioneId ? `?azione=${encodeURIComponent(azioneId)}` : ''}`);
  await browser.tabs.create({ url });
}
