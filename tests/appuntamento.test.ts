import { describe, expect, it } from 'vitest';
import {
  appuntamentoInSospeso,
  decidiAppuntamento,
  fineRecuperoAppuntamento,
  pianificaGiorno,
  prossimoAppuntamento,
  quantiCasuali,
} from '../src/core/scheduler';
import { MINUTO } from '../src/core/time';
import { azione, d, impostazioni } from './helpers';

const imp = impostazioni(); // appuntamento attivo alle 18:00, silenzio 22:30-07:30
const base = {
  impostazioni: imp,
  statoIdle: 'active' as const,
  azioni: [azione({ prossimaComparsa: d(2026, 11, 2, 9) })],
};

describe('appuntamento fisso', () => {
  it('l\'orario predefinito è le 18:00, attivo', () => {
    expect(imp.appuntamento).toEqual({ attivo: true, ora: '18:00' });
  });

  it('alle 18 invia', () => {
    expect(decidiAppuntamento({ ...base, adesso: d(2026, 11, 2, 18, 0) }).invia).toBe(true);
  });

  it('prima delle 18 è presto', () => {
    expect(decidiAppuntamento({ ...base, adesso: d(2026, 11, 2, 17, 59) })).toEqual({ invia: false, motivo: 'presto' });
  });

  it('computer acceso più tardi: recupera entro 4 ore, poi lascia perdere', () => {
    expect(decidiAppuntamento({ ...base, adesso: d(2026, 11, 2, 21, 30) }).invia).toBe(true);
    expect(decidiAppuntamento({ ...base, adesso: d(2026, 11, 2, 22, 0) })).toEqual({ invia: false, motivo: 'scaduto' });
  });

  it('mai il giorno dopo, anche con un appuntamento tardi', () => {
    const tardi = impostazioni({ appuntamento: { attivo: true, ora: '22:00' }, finestreSilenzio: [] });
    expect(fineRecuperoAppuntamento(d(2026, 11, 2, 22, 30), tardi)).toBe(d(2026, 11, 3));
    expect(decidiAppuntamento({ ...base, impostazioni: tardi, adesso: d(2026, 11, 3, 0, 30) })).toEqual({ invia: false, motivo: 'presto' });
  });

  it('una volta sola al giorno', () => {
    expect(decidiAppuntamento({ ...base, adesso: d(2026, 11, 2, 19), fattoIl: '2026-11-02' })).toEqual({ invia: false, motivo: 'gia_fatto' });
    expect(decidiAppuntamento({ ...base, adesso: d(2026, 11, 3, 18), fattoIl: '2026-11-02' }).invia).toBe(true);
  });

  it('rispetta Silenzio e presenza, ignora gli orari attivi', () => {
    const adesso = d(2026, 11, 2, 18, 5);
    expect(decidiAppuntamento({ ...base, adesso, silenzioFino: adesso + 10 * MINUTO })).toEqual({ invia: false, motivo: 'silenzio' });
    expect(decidiAppuntamento({ ...base, adesso, statoIdle: 'idle' })).toEqual({ invia: false, motivo: 'inattivo' });
    const presto = impostazioni({ orariAttivi: { da: '09:00', a: '12:00' } });
    expect(decidiAppuntamento({ ...base, impostazioni: presto, adesso }).invia).toBe(true);
  });

  it('niente da ricordare = niente notifica', () => {
    expect(decidiAppuntamento({ ...base, azioni: [], adesso: d(2026, 11, 2, 18) })).toEqual({ invia: false, motivo: 'niente_da_ricordare' });
  });

  it('si può spegnere', () => {
    const spento = impostazioni({ appuntamento: { attivo: false, ora: '18:00' } });
    expect(decidiAppuntamento({ ...base, impostazioni: spento, adesso: d(2026, 11, 2, 18) })).toEqual({ invia: false, motivo: 'disattivato' });
    expect(prossimoAppuntamento(d(2026, 11, 2, 10), spento)).toBeUndefined();
    expect(appuntamentoInSospeso(d(2026, 11, 2, 10), spento)).toBe(false);
  });

  it('prossimo allarme: oggi alle 18, oppure domani se già passato o fatto', () => {
    expect(prossimoAppuntamento(d(2026, 11, 2, 10), imp)).toBe(d(2026, 11, 2, 18));
    expect(prossimoAppuntamento(d(2026, 11, 2, 18, 30), imp)).toBe(d(2026, 11, 3, 18));
    expect(prossimoAppuntamento(d(2026, 11, 2, 10), imp, '2026-11-02')).toBe(d(2026, 11, 3, 18));
  });

  it('occupa uno dei promemoria del giorno', () => {
    expect(quantiCasuali(4, 0, true)).toBe(1); // vigile: 2 in tutto
    expect(quantiCasuali(4, 0, false)).toBe(2);
    expect(quantiCasuali(1, 0, true)).toBe(0); // sazio: solo l'appuntamento
    expect(quantiCasuali(10, 3, true)).toBe(0);
  });

  it('i promemoria casuali stanno lontani dall\'appuntamento', () => {
    const stretto = impostazioni({ orariAttivi: { da: '16:00', a: '20:00' }, finestreSilenzio: [] });
    for (let i = 0; i < 30; i++) {
      const piano = pianificaGiorno({
        adesso: d(2026, 11, 2, 8),
        impostazioni: stretto,
        quanti: 1,
        occupati: [d(2026, 11, 2, 18)],
        casuale: () => i / 30,
      });
      expect(Math.abs(piano[0]! - d(2026, 11, 2, 18))).toBeGreaterThanOrEqual(60 * MINUTO);
    }
  });
});
