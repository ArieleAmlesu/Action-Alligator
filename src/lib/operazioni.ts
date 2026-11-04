// Operazioni dell'utente (Tana, popup, impostazioni). Ognuna legge i dati,
// applica una funzione pura di src/core, registra l'evento e salva.

import { applicaEvento } from '../core/hunger';
import type { Dati } from '../core/io';
import {
  attiva,
  butta,
  chiudi,
  contaAttive,
  creaAzione,
  mandaInPalude,
  orarioFaccioAlle,
  rispondiAbitudine,
  segnaFaccioAlle,
  segnaFatta,
  segnaNonAncora,
  segnaPiuTardi,
  type EsitoAttivazione,
  type SceltaFaccioAlle,
} from '../core/rhythm';
import { chiaveGiorno, MINUTO } from '../core/time';
import type { Azione, Evento, Fonte, Impostazioni, TipoAzione, TipoEvento, TipoFonte } from '../core/types';
import { annullaPromemoriaRichiesto, chiudiNotifichePer, programmaPromemoriaRichiesto, ripianificaOggi } from './promemoria';
import { inCoda, leggiDati, nuovoId, scriviDati } from './storage';

export const MINUTI_SILENZIO = 45;

function evento(tipo: TipoEvento, momento: number, azioneId?: string): Evento {
  return { id: nuovoId(), tipo, momento, ...(azioneId ? { azioneId } : {}) };
}

function sostituisci(azioni: Azione[], nuova: Azione): Azione[] {
  return azioni.map((a) => (a.id === nuova.id ? nuova : a));
}

function trova(dati: Dati, id: string): Azione {
  const a = dati.azioni.find((x) => x.id === id);
  if (!a) throw new Error('Azione non trovata');
  return a;
}

export interface NuovaAzione {
  fonteTitolo: string;
  fonteTipo: TipoFonte;
  quando: string;
  faro: string;
  versione2min: string;
  tipo: TipoAzione;
}

/** Aggiunta veloce. Se ci sono già 3 attive, l'azione va in Palude. */
export function aggiungiAzione(n: NuovaAzione): Promise<Azione> {
  return inCoda(async () => {
    const adesso = Date.now();
    const dati = await leggiDati();
    let fonti = dati.fonti;
    let fonteId: string | undefined;
    const titolo = n.fonteTitolo.trim();
    if (titolo) {
      const esistente = fonti.find((f) => f.titolo.toLowerCase() === titolo.toLowerCase());
      if (esistente) {
        fonteId = esistente.id;
      } else {
        const fonte: Fonte = { id: nuovoId(), titolo, tipo: n.fonteTipo, data: adesso };
        fonti = [...fonti, fonte];
        fonteId = fonte.id;
      }
    }
    const azione = creaAzione(
      { id: nuovoId(), quando: n.quando, faro: n.faro, versione2min: n.versione2min, tipo: n.tipo, fonteId },
      contaAttive(dati.azioni),
      adesso,
    );
    await scriviDati({ azioni: [...dati.azioni, azione], fonti });
    return azione;
  });
}

export function fatta(id: string): Promise<{ chiediAbitudine: boolean }> {
  return inCoda(async () => {
    const adesso = Date.now();
    const dati = await leggiDati();
    const r = segnaFatta(trova(dati, id), adesso);
    await scriviDati({
      azioni: sostituisci(dati.azioni, r.azione),
      eventi: [...dati.eventi, evento('fatta', adesso, id)],
      stato: applicaEvento(dati.stato, 'fatta'),
    });
    await annullaPromemoriaRichiesto(id);
    await chiudiNotifichePer(id);
    return { chiediAbitudine: r.chiediAbitudine };
  });
}

export function rispondiDomandaAbitudine(id: string, diventata: boolean): Promise<void> {
  return inCoda(async () => {
    const dati = await leggiDati();
    await scriviDati({ azioni: sostituisci(dati.azioni, rispondiAbitudine(trova(dati, id), diventata, Date.now())) });
  });
}

export function nonAncora(id: string): Promise<{ proponiAlternative: boolean }> {
  return inCoda(async () => {
    const adesso = Date.now();
    const dati = await leggiDati();
    const r = segnaNonAncora(trova(dati, id), adesso);
    await scriviDati({
      azioni: sostituisci(dati.azioni, r.azione),
      eventi: [...dati.eventi, evento('non_ancora', adesso, id)],
      stato: applicaEvento(dati.stato, 'non_ancora'),
    });
    await annullaPromemoriaRichiesto(id);
    await chiudiNotifichePer(id);
    return { proponiAlternative: r.proponiAlternative };
  });
}

export function piuTardi(id: string): Promise<number> {
  return inCoda(async () => {
    const adesso = Date.now();
    const dati = await leggiDati();
    const a = segnaPiuTardi(trova(dati, id), adesso);
    await scriviDati({ azioni: sostituisci(dati.azioni, a), eventi: [...dati.eventi, evento('piu_tardi', adesso, id)] });
    await programmaPromemoriaRichiesto(id, a.prossimaComparsa);
    await chiudiNotifichePer(id);
    return a.prossimaComparsa;
  });
}

/** La faccio alle...: nessun effetto sulla fame, crea un promemoria a quell'ora. */
export function faccioAlle(id: string, scelta: SceltaFaccioAlle): Promise<number> {
  return inCoda(async () => {
    const adesso = Date.now();
    const dati = await leggiDati();
    const quando = orarioFaccioAlle(scelta, dati.impostazioni.orariFaccioAlle, adesso);
    await scriviDati({ azioni: sostituisci(dati.azioni, segnaFaccioAlle(trova(dati, id), quando, adesso)) });
    await programmaPromemoriaRichiesto(id, quando);
    await chiudiNotifichePer(id);
    return quando;
  });
}

export function attivaAzione(id: string): Promise<EsitoAttivazione> {
  return inCoda(async () => {
    const dati = await leggiDati();
    const r = attiva(trova(dati, id), dati.azioni, Date.now());
    if (r.ok) await scriviDati({ azioni: sostituisci(dati.azioni, r.azione) });
    return r;
  });
}

export type Chiusura = 'palude' | 'butta' | 'chiudi';

export function chiudiAzione(id: string, come: Chiusura): Promise<void> {
  return inCoda(async () => {
    const adesso = Date.now();
    const dati = await leggiDati();
    const a = trova(dati, id);
    const nuova = come === 'palude' ? mandaInPalude(a, adesso) : come === 'butta' ? butta(a, adesso) : chiudi(a, adesso);
    await scriviDati({ azioni: sostituisci(dati.azioni, nuova) });
    await annullaPromemoriaRichiesto(id);
    await chiudiNotifichePer(id);
  });
}

export function modificaAzione(
  id: string,
  campi: Pick<Azione, 'quando' | 'faro' | 'versione2min' | 'tipo'>,
): Promise<void> {
  return inCoda(async () => {
    const adesso = Date.now();
    const dati = await leggiDati();
    const a = trova(dati, id);
    const nuova: Azione = {
      ...a,
      quando: campi.quando.trim(),
      faro: campi.faro.trim(),
      versione2min: campi.versione2min.trim(),
      tipo: campi.tipo,
      // Dopo averla rimpicciolita o spostata, la serie di rinvii riparte.
      nonAncoraDiFila: 0,
      aggiornata: adesso,
    };
    await scriviDati({ azioni: sostituisci(dati.azioni, nuova) });
  });
}

/** Silenzio: 45 minuti senza notifiche, nessuna penalità. */
export function silenzio(): Promise<number> {
  return inCoda(async () => {
    const adesso = Date.now();
    const dati = await leggiDati();
    const fino = adesso + MINUTI_SILENZIO * MINUTO;
    await scriviDati({
      stato: { ...dati.stato, silenzioFino: fino },
      eventi: [...dati.eventi, evento('silenzio', adesso)],
    });
    return fino;
  });
}

export function terminaSilenzio(): Promise<void> {
  return inCoda(async () => {
    const dati = await leggiDati();
    const stato = { ...dati.stato };
    delete stato.silenzioFino;
    await scriviDati({ stato });
  });
}

export function segnaRevisioneFatta(): Promise<void> {
  return inCoda(async () => {
    const dati = await leggiDati();
    await scriviDati({ stato: { ...dati.stato, revisioneFatta: chiaveGiorno(Date.now()) } });
  });
}

export async function salvaImpostazioni(impostazioni: Impostazioni): Promise<void> {
  await inCoda(() => scriviDati({ impostazioni }));
  await ripianificaOggi();
}

export async function sostituisciTuttiIDati(dati: Dati): Promise<void> {
  await inCoda(() => scriviDati(dati));
  await ripianificaOggi();
}
