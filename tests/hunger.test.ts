import { describe, expect, it } from 'vitest';
import {
  annotaScadenzeOggi,
  applicaEvento,
  giorniDiDigiuno,
  limitaFame,
  maxPromemoriaAlGiorno,
  umore,
  valutaGiorniPassati,
} from '../src/core/hunger';
import { STATO_INIZIALE, type Evento, type StatoAlligatore } from '../src/core/types';
import { azione, d } from './helpers';

const s = (over: Partial<StatoAlligatore> = {}): StatoAlligatore => ({ ...STATO_INIZIALE, ...over });
const ev = (tipo: Evento['tipo'], momento: number): Evento => ({ id: `${tipo}${momento}`, tipo, momento });

describe('stati della fame', () => {
  it('sazio 0-2, vigile 3-5, affamato 6-8, feroce 9-10', () => {
    expect([0, 2, 2.5, 3, 5, 5.5, 6, 8, 8.5, 9, 10].map(umore)).toEqual([
      'sazio', 'sazio', 'sazio', 'vigile', 'vigile', 'vigile', 'affamato', 'affamato', 'affamato', 'feroce', 'feroce',
    ]);
  });

  it('parte da 4 e resta tra 0 e 10', () => {
    expect(STATO_INIZIALE.fame).toBe(4);
    expect(limitaFame(-2)).toBe(0);
    expect(limitaFame(12)).toBe(10);
  });

  it('tetto giornaliero dei promemoria: 1, 2, 3, 4', () => {
    expect([1, 4, 7, 10].map(maxPromemoriaAlGiorno)).toEqual([1, 2, 3, 4]);
  });
});

describe('effetto degli eventi', () => {
  it('Fatta -3, Non ancora +0,5, e mai sotto zero', () => {
    expect(applicaEvento(s({ fame: 5 }), 'fatta').fame).toBe(2);
    expect(applicaEvento(s({ fame: 1 }), 'fatta').fame).toBe(0);
    expect(applicaEvento(s({ fame: 4 }), 'non_ancora').fame).toBe(4.5);
    expect(applicaEvento(s({ fame: 10 }), 'non_ancora').fame).toBe(10);
  });

  it('Silenzio, Più tardi e notifica non cambiano nulla', () => {
    for (const t of ['silenzio', 'piu_tardi', 'notifica'] as const) expect(applicaEvento(s(), t)).toEqual(s());
  });

  it('+1 ogni 2 promemoria ignorati', () => {
    const a = applicaEvento(s(), 'ignorata');
    expect(a.fame).toBe(4);
    expect(a.ignorateDaContare).toBe(1);
    const b = applicaEvento(a, 'ignorata');
    expect(b.fame).toBe(5);
    expect(b.ignorateDaContare).toBe(0);
  });
});

describe('fame giornaliera', () => {
  const OGGI = d(2026, 11, 4, 9); // mercoledì

  it('alla prima esecuzione non penalizza il passato', () => {
    const r = valutaGiorniPassati(s(), [azione({ prossimaComparsa: d(2026, 10, 1) })], [], OGGI);
    expect(r.fame).toBe(4);
    expect(r.ultimoGiornoValutato).toBe('2026-11-03');
  });

  it('+1 per ogni giorno con azione in scadenza e nessuna Fatta', () => {
    const stato = s({ ultimoGiornoValutato: '2026-11-01' });
    // Azione in attesa dal 2 novembre: 2 e 3 sono giorni a digiuno.
    const r = valutaGiorniPassati(stato, [azione({ prossimaComparsa: d(2026, 11, 2, 8) })], [], OGGI);
    expect(r.fame).toBe(6);
    expect(r.ultimoGiornoValutato).toBe('2026-11-03');
    // Rivalutare lo stesso giorno non cambia nulla.
    expect(valutaGiorniPassati(r, [], [], OGGI + 3_600_000)).toEqual(r);
  });

  it('un giorno con una Fatta non conta', () => {
    const stato = s({ ultimoGiornoValutato: '2026-11-01', giorniInScadenza: ['2026-11-02', '2026-11-03'] });
    const r = valutaGiorniPassati(stato, [], [ev('fatta', d(2026, 11, 3, 18))], OGGI);
    expect(r.fame).toBe(5);
  });

  it('un giorno senza azioni in scadenza non conta', () => {
    const stato = s({ ultimoGiornoValutato: '2026-11-01' });
    const r = valutaGiorniPassati(stato, [azione({ prossimaComparsa: d(2026, 11, 10) })], [], OGGI);
    expect(r.fame).toBe(4);
  });

  it('annota i giorni con scadenze', () => {
    const r = annotaScadenzeOggi(s(), [azione({ prossimaComparsa: d(2026, 11, 4, 20) })], OGGI);
    expect(r.giorniInScadenza).toEqual(['2026-11-04']);
    expect(annotaScadenzeOggi(s(), [azione({ prossimaComparsa: d(2026, 11, 5, 1) })], OGGI).giorniInScadenza).toEqual([]);
  });

  it('giorni di digiuno dall\'ultima Fatta', () => {
    expect(giorniDiDigiuno([], OGGI)).toBe(0);
    expect(giorniDiDigiuno([ev('fatta', d(2026, 11, 1, 23)), ev('non_ancora', d(2026, 11, 3))], OGGI)).toBe(3);
    expect(giorniDiDigiuno([ev('fatta', d(2026, 11, 4, 8))], OGGI)).toBe(0);
  });
});
