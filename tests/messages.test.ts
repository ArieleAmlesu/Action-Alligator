import { describe, expect, it } from 'vitest';
import { componiMessaggio, FRASI, frasiUtilizzabili } from '../src/core/messages';

const UMORI = ['sazio', 'vigile', 'affamato', 'feroce'] as const;
const PAROLE_VIETATE = /pigr|stupid|vergogn|fallit|incapace|idiot|scars[oa]\b/i;

describe('messaggi', () => {
  it('almeno 6 frasi per stato, senza insulti', () => {
    for (const u of UMORI) {
      expect(FRASI[u].length).toBeGreaterThanOrEqual(6);
      for (const f of FRASI[u]) expect(f.testo).not.toMatch(PAROLE_VIETATE);
    }
  });

  it('ogni stato ha almeno 6 frasi utilizzabili quando le variabili hanno senso', () => {
    for (const u of UMORI) {
      expect(frasiUtilizzabili(u, { azione: 'x', giorni: 3, volte: 3 }).length).toBeGreaterThanOrEqual(6);
    }
  });

  it('le variabili usate sono solo {azione}, {giorni}, {volte}', () => {
    for (const u of UMORI) {
      for (const f of FRASI[u]) {
        for (const m of f.testo.matchAll(/\{(\w+)\}/g)) expect(['azione', 'giorni', 'volte']).toContain(m[1]);
      }
    }
  });

  it('nessuna frase con "0 giorni" o "1 volte"', () => {
    for (const u of UMORI) {
      for (let i = 0; i < 20; i++) {
        const m = componiMessaggio(u, { azione: 'scrivo', giorni: 0, volte: 1 }, () => i / 20);
        expect(m).not.toMatch(/\b[01] giorni|\b[01] volte|numero [01]\b/);
        expect(m).not.toMatch(/\{/);
      }
    }
  });

  it('il feroce propone sempre una via d\'uscita', () => {
    const uscita = /2 minuti|due minuti|rimpiccioli|cambiamo momento|Palude|un solo Fatta/i;
    for (const f of FRASI.feroce) expect(f.testo).toMatch(uscita);
  });

  it('riempie le variabili', () => {
    const m = componiMessaggio('affamato', { azione: 'Meditare', giorni: 4, volte: 0 }, () => 0);
    expect(m).toBe('4 giorni a digiuno. «Meditare» è ancora lì che aspetta.');
  });
});
