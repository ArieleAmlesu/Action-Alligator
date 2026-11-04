import { describe, expect, it } from 'vitest';
import {
  decidiPromemoriaCasuale,
  decidiPromemoriaRichiesto,
  inSilenzio,
  orarioPermesso,
  pianificaGiorno,
  prossimoMomentoLibero,
  scegliAzioneDaRicordare,
} from '../src/core/scheduler';
import { inFinestra, MINUTO } from '../src/core/time';
import { azione, d, impostazioni } from './helpers';

// Generatore pseudo-casuale deterministico per i test.
function seme(n: number) {
  let x = n;
  return () => {
    x = (x * 1103515245 + 12345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

const imp = impostazioni({
  orariAttivi: { da: '09:00', a: '21:00' },
  finestreSilenzio: [
    { da: '12:30', a: '14:00' },
    { da: '22:30', a: '07:30' },
  ],
});

describe('finestre e silenzio', () => {
  it('le finestre possono scavalcare la mezzanotte', () => {
    expect(inSilenzio(d(2026, 11, 2, 23), imp)).toBe(true);
    expect(inSilenzio(d(2026, 11, 2, 7), imp)).toBe(true);
    expect(inSilenzio(d(2026, 11, 2, 7, 30), imp)).toBe(false);
    expect(inSilenzio(d(2026, 11, 2, 13), imp)).toBe(true);
  });

  it('il Silenzio di 45 minuti blocca', () => {
    const adesso = d(2026, 11, 2, 10);
    expect(inSilenzio(adesso, imp, adesso + 45 * MINUTO)).toBe(true);
    expect(inSilenzio(adesso + 45 * MINUTO, imp, adesso + 45 * MINUTO)).toBe(false);
  });

  it('orario permesso = dentro orari attivi e fuori dal silenzio', () => {
    expect(orarioPermesso(d(2026, 11, 2, 8), imp)).toBe(false);
    expect(orarioPermesso(d(2026, 11, 2, 10), imp)).toBe(true);
    expect(orarioPermesso(d(2026, 11, 2, 13), imp)).toBe(false);
    expect(orarioPermesso(d(2026, 11, 2, 21), imp)).toBe(false);
  });
});

describe('pianificaGiorno', () => {
  it('sceglie orari dentro gli orari attivi, mai in silenzio, ordinati e distanziati', () => {
    for (let s = 1; s <= 50; s++) {
      const piano = pianificaGiorno({ adesso: d(2026, 11, 2, 0, 5), impostazioni: imp, quanti: 4, casuale: seme(s) });
      expect(piano).toHaveLength(4);
      expect([...piano].sort((a, b) => a - b)).toEqual(piano);
      for (const t of piano) {
        expect(inFinestra(t, imp.orariAttivi)).toBe(true);
        expect(inSilenzio(t, imp)).toBe(false);
      }
      for (let i = 1; i < piano.length; i++) expect(piano[i] - piano[i - 1]).toBeGreaterThanOrEqual(60 * MINUTO);
    }
  });

  it('parte da adesso, non dal passato', () => {
    const adesso = d(2026, 11, 2, 18, 0);
    const piano = pianificaGiorno({ adesso, impostazioni: imp, quanti: 2, casuale: seme(3) });
    expect(piano.every((t) => t > adesso && t < d(2026, 11, 2, 21))).toBe(true);
  });

  it('evita il Silenzio in corso', () => {
    const adesso = d(2026, 11, 2, 15, 0);
    const silenzioFino = adesso + 45 * MINUTO;
    const piano = pianificaGiorno({ adesso, impostazioni: imp, silenzioFino, quanti: 3, casuale: seme(7) });
    expect(piano.every((t) => t >= silenzioFino)).toBe(true);
  });

  it('nessun orario se la giornata attiva è finita', () => {
    expect(pianificaGiorno({ adesso: d(2026, 11, 2, 21, 30), impostazioni: imp, quanti: 2 })).toEqual([]);
  });

  it('se lo spazio è poco, rinuncia alla distanza piuttosto che al numero', () => {
    const stretto = impostazioni({ orariAttivi: { da: '10:00', a: '10:30' }, finestreSilenzio: [] });
    const piano = pianificaGiorno({ adesso: d(2026, 11, 2, 0), impostazioni: stretto, quanti: 3, casuale: seme(1) });
    expect(piano).toHaveLength(3);
    expect(new Set(piano).size).toBe(3);
  });
});

describe('decidiPromemoriaCasuale', () => {
  const base = {
    adesso: d(2026, 11, 2, 10),
    impostazioni: imp,
    fame: 4, // vigile -> 2 al giorno
    inviateOggi: 0,
    statoIdle: 'active' as const,
    azioni: [azione({ prossimaComparsa: d(2026, 11, 2, 9) })],
  };

  it('invia se tutto è a posto', () => {
    const r = decidiPromemoriaCasuale(base);
    expect(r.invia).toBe(true);
  });

  it('rispetta il tetto giornaliero secondo la fame', () => {
    expect(decidiPromemoriaCasuale({ ...base, inviateOggi: 2 })).toEqual({ invia: false, motivo: 'tetto' });
    expect(decidiPromemoriaCasuale({ ...base, fame: 1, inviateOggi: 1 })).toEqual({ invia: false, motivo: 'tetto' });
    expect(decidiPromemoriaCasuale({ ...base, fame: 9, inviateOggi: 3 }).invia).toBe(true);
    expect(decidiPromemoriaCasuale({ ...base, fame: 9, inviateOggi: 4 })).toEqual({ invia: false, motivo: 'tetto' });
  });

  it('mai durante il Silenzio o in una finestra di silenzio', () => {
    expect(decidiPromemoriaCasuale({ ...base, silenzioFino: base.adesso + MINUTO })).toEqual({ invia: false, motivo: 'silenzio' });
    expect(decidiPromemoriaCasuale({ ...base, adesso: d(2026, 11, 2, 13) })).toEqual({ invia: false, motivo: 'silenzio' });
  });

  it('mai fuori dagli orari attivi', () => {
    expect(decidiPromemoriaCasuale({ ...base, adesso: d(2026, 11, 2, 21, 15) })).toEqual({ invia: false, motivo: 'fuori_orario' });
  });

  it('solo se l\'utente è attivo', () => {
    expect(decidiPromemoriaCasuale({ ...base, statoIdle: 'idle' })).toEqual({ invia: false, motivo: 'inattivo' });
    expect(decidiPromemoriaCasuale({ ...base, statoIdle: 'locked' })).toEqual({ invia: false, motivo: 'inattivo' });
  });

  it('niente promemoria se non c\'è nulla in scadenza', () => {
    expect(decidiPromemoriaCasuale({ ...base, azioni: [azione({ prossimaComparsa: d(2026, 11, 5) })] })).toEqual({
      invia: false,
      motivo: 'niente_da_ricordare',
    });
  });
});

describe('promemoria richiesti (La faccio alle..., Più tardi)', () => {
  it('ignorano tetto e orari attivi ma non il silenzio', () => {
    const a = azione({ prossimaComparsa: d(2026, 11, 2, 21, 30) });
    const c = { adesso: d(2026, 11, 2, 21, 30), impostazioni: imp, statoIdle: 'active' as const, azioni: [a] };
    expect(decidiPromemoriaRichiesto(c, a.id).invia).toBe(true);
    expect(decidiPromemoriaRichiesto({ ...c, adesso: d(2026, 11, 2, 23) }, a.id)).toEqual({ invia: false, motivo: 'silenzio' });
    expect(decidiPromemoriaRichiesto({ ...c, statoIdle: 'idle' }, a.id)).toEqual({ invia: false, motivo: 'inattivo' });
  });

  it('niente se l\'azione è già stata fatta', () => {
    const a = azione({ stato: 'fatta' });
    expect(decidiPromemoriaRichiesto({ adesso: d(2026, 11, 2, 10), impostazioni: imp, statoIdle: 'active', azioni: [a] }, a.id).invia).toBe(false);
  });

  it('prossimo momento libero dopo il silenzio', () => {
    expect(prossimoMomentoLibero(d(2026, 11, 2, 23), imp)).toBe(d(2026, 11, 3, 7, 30));
    expect(prossimoMomentoLibero(d(2026, 11, 2, 10), imp, d(2026, 11, 2, 10, 45))).toBe(d(2026, 11, 2, 10, 45));
  });
});

describe('scegliAzioneDaRicordare', () => {
  it('prima la più in ritardo tra le attive, poi le abitudini', () => {
    const adesso = d(2026, 11, 2, 10);
    const vecchia = azione({ prossimaComparsa: d(2026, 10, 30) });
    const recente = azione({ prossimaComparsa: d(2026, 11, 2, 8) });
    const abitudine = azione({ stato: 'abitudine', prossimaComparsa: d(2026, 10, 1) });
    expect(scegliAzioneDaRicordare([recente, abitudine, vecchia], adesso)?.id).toBe(vecchia.id);
    expect(scegliAzioneDaRicordare([abitudine], adesso)?.id).toBe(abitudine.id);
    expect(scegliAzioneDaRicordare([], adesso)).toBeUndefined();
  });
});
