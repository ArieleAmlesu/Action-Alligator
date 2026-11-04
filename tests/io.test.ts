import { describe, expect, it } from 'vitest';
import { esporta, importa } from '../src/core/io';
import { normalizzaSito, patternPerSito } from '../src/core/sites';
import { numeriSettimana, proponiRevisione } from '../src/core/stats';
import { STATO_INIZIALE } from '../src/core/types';
import { azione, d, impostazioni } from './helpers';

describe('esporta / importa', () => {
  const dati = {
    azioni: [azione({ fonteId: 'f1', inAttesaAbitudine: true })],
    fonti: [{ id: 'f1', titolo: 'Atomic', tipo: 'libro' as const, data: d(2026, 11, 1) }],
    eventi: [{ id: 'e1', azioneId: 'x', tipo: 'fatta' as const, momento: d(2026, 11, 2) }],
    impostazioni: impostazioni(),
    stato: { ...STATO_INIZIALE, silenzioFino: 5 },
  };

  it('andata e ritorno senza perdite', () => {
    const r = importa(JSON.stringify(esporta(dati, 1)));
    expect(r).toEqual({ ok: true, dati });
  });

  it('rifiuta file non validi con un messaggio chiaro', () => {
    expect(importa('non json')).toEqual({ ok: false, errore: 'Il file non è un JSON valido.' });
    expect(importa('{"app":"altro"}').ok).toBe(false);
    const rotto = esporta(dati, 1) as unknown as { azioni: Record<string, unknown>[] };
    rotto.azioni[0].stato = 'boh';
    const r = importa(JSON.stringify(rotto));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errore).toContain('Azione n. 1');
  });
});

describe('siti del post-it', () => {
  it('normalizza i domini', () => {
    expect(normalizzaSito('YouTube.com')).toBe('youtube.com');
    expect(normalizzaSito('https://www.youtube.com/watch?v=1')).toBe('youtube.com');
    expect(normalizzaSito('ftp://x.com')).toBeNull();
    expect(normalizzaSito('ciao')).toBeNull();
    expect(normalizzaSito('')).toBeNull();
  });

  it('crea i pattern per il dominio e i sottodomini', () => {
    expect(patternPerSito('youtube.com')).toEqual(['*://youtube.com/*', '*://*.youtube.com/*']);
  });
});

describe('settimana', () => {
  it('conta fonti e azioni fatte da lunedì', () => {
    const adesso = d(2026, 11, 4, 12); // mercoledì
    const fonti = [
      { id: '1', titolo: 'a', tipo: 'libro' as const, data: d(2026, 11, 1, 23) }, // domenica prima
      { id: '2', titolo: 'b', tipo: 'video' as const, data: d(2026, 11, 2, 9) },
    ];
    const eventi = [
      { id: 'a', tipo: 'fatta' as const, momento: d(2026, 11, 3) },
      { id: 'b', tipo: 'non_ancora' as const, momento: d(2026, 11, 3) },
    ];
    expect(numeriSettimana(fonti, eventi, adesso)).toEqual({ fontiAggiunte: 1, azioniFatte: 1 });
  });

  it('propone la revisione solo la domenica, una volta', () => {
    expect(proponiRevisione(STATO_INIZIALE, d(2026, 11, 8, 10))).toBe(true);
    expect(proponiRevisione({ ...STATO_INIZIALE, revisioneFatta: '2026-11-08' }, d(2026, 11, 8, 10))).toBe(false);
    expect(proponiRevisione(STATO_INIZIALE, d(2026, 11, 9, 10))).toBe(false);
  });
});
