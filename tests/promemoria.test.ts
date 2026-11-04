// Test dello strato "browser": allarmi e notifiche con il finto browser di WXT.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { aggiungiAzione, fatta, silenzio } from '../src/lib/operazioni';
import { gestisciAllarme, notificaChiusa, notificaCliccata, ripianificaOggi } from '../src/lib/promemoria';
import { leggiDati, leggiInterno } from '../src/lib/storage';
import { d } from './helpers';

const ADESSO = d(2026, 11, 2, 10, 0); // lunedì

async function allarmi(prefisso: string) {
  return (await fakeBrowser.alarms.getAll()).filter((a) => a.name.startsWith(prefisso));
}

async function nuovaAzione() {
  return aggiungiAzione({
    fonteTitolo: 'Atomic Habits',
    fonteTipo: 'libro',
    quando: 'apro il portatile',
    faro: 'scrivo 3 priorità',
    versione2min: 'scrivo la prima',
    tipo: 'ricorrente',
  });
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(ADESSO);
});

describe('ciclo di un promemoria', () => {
  it('pianifica tanti promemoria quanti ne concede la fame (vigile = 2)', async () => {
    await nuovaAzione();
    await ripianificaOggi(ADESSO);
    const casuali = await allarmi('casuale:');
    expect(casuali).toHaveLength(2);
    for (const a of casuali) expect(a.scheduledTime).toBeGreaterThan(ADESSO);
    expect((await leggiInterno()).piano).toEqual({ giorno: '2026-11-02', inviate: 0 });
  });

  it('invia una notifica senza pulsanti e la conta come ignorata dopo 30 minuti', async () => {
    const azione = await nuovaAzione();
    await gestisciAllarme('casuale:1', ADESSO);

    const notifiche = await fakeBrowser.notifications.getAll();
    const ids = Object.keys(notifiche);
    expect(ids).toHaveLength(1);
    expect(notifiche[ids[0]!]).not.toHaveProperty('buttons');
    expect((await leggiInterno()).notifiche[ids[0]!]?.azioneId).toBe(azione.id);
    expect(await allarmi('ignora:')).toHaveLength(1);

    await gestisciAllarme(`ignora:${ids[0]}`, ADESSO + 30 * 60_000);
    const dati = await leggiDati();
    expect(dati.eventi.map((e) => e.tipo)).toEqual(['notifica', 'ignorata']);
    expect(dati.stato.ignorateDaContare).toBe(1);
    expect(dati.stato.fame).toBe(4);
  });

  it('due promemoria ignorati = +1 fame; una notifica chiusa da te conta subito', async () => {
    await nuovaAzione();
    await gestisciAllarme('casuale:1', ADESSO);
    await gestisciAllarme('casuale:2', ADESSO + 60 * 60_000);
    const ids = Object.keys(await fakeBrowser.notifications.getAll());
    expect(ids).toHaveLength(2);
    await notificaChiusa(ids[0]!, true, ADESSO + 2 * 60 * 60_000);
    await notificaChiusa(ids[1]!, false); // sparita da sola: non conta ancora
    expect((await leggiDati()).stato.fame).toBe(4);
    await gestisciAllarme(`ignora:${ids[1]}`, ADESSO + 3 * 60 * 60_000);
    expect((await leggiDati()).stato.fame).toBe(5);
  });

  it('il clic apre la Tana sull\'azione e non conta come ignorata', async () => {
    const azione = await nuovaAzione();
    await gestisciAllarme('casuale:1', ADESSO);
    const [id] = Object.keys(await fakeBrowser.notifications.getAll());
    await notificaCliccata(id!);
    const schede = await fakeBrowser.tabs.query({});
    expect(schede.some((t) => t.url?.endsWith(`/newtab.html?azione=${azione.id}`))).toBe(true);
    await gestisciAllarme(`ignora:${id}`, ADESSO + 30 * 60_000);
    expect((await leggiDati()).eventi.map((e) => e.tipo)).toEqual(['notifica']);
  });

  it('Fatta dalla Tana chiude la notifica aperta senza penalità', async () => {
    const azione = await nuovaAzione();
    await gestisciAllarme('casuale:1', ADESSO);
    await fatta(azione.id);
    expect(Object.keys((await leggiInterno()).notifiche)).toHaveLength(0);
    const dati = await leggiDati();
    expect(dati.eventi.map((e) => e.tipo)).toEqual(['notifica', 'fatta']);
    expect(dati.stato.fame).toBe(1);
  });

  it('rispetta il tetto giornaliero', async () => {
    await nuovaAzione();
    await ripianificaOggi(ADESSO);
    for (let i = 0; i < 4; i++) await gestisciAllarme(`casuale:${i}`, ADESSO + i * 60 * 60_000);
    expect(Object.keys(await fakeBrowser.notifications.getAll())).toHaveLength(2);
  });

  it('durante il Silenzio non notifica e riprova 5 minuti dopo la fine', async () => {
    await nuovaAzione();
    const fino = await silenzio();
    await gestisciAllarme('casuale:1', ADESSO + 10 * 60_000);
    expect(Object.keys(await fakeBrowser.notifications.getAll())).toHaveLength(0);
    const riprova = await allarmi('casuale:');
    expect(riprova.map((a) => a.scheduledTime)).toEqual([fino + 5 * 60_000]);
    const dati = await leggiDati();
    expect(dati.stato.fame).toBe(4); // il Silenzio non costa nulla
  });

  it('nessuna notifica in una finestra di silenzio', async () => {
    await nuovaAzione();
    await gestisciAllarme('casuale:1', d(2026, 11, 2, 23, 0));
    expect(Object.keys(await fakeBrowser.notifications.getAll())).toHaveLength(0);
  });
});
