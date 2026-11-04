import { describe, expect, it } from 'vitest';
import {
  attiva,
  creaAzione,
  INTERVALLI_GIORNI,
  inScadenza,
  orarioFaccioAlle,
  rispondiAbitudine,
  segnaFaccioAlle,
  segnaFatta,
  segnaNonAncora,
  segnaPiuTardi,
} from '../src/core/rhythm';
import { azione, d } from './helpers';

const ADESSO = d(2026, 11, 2, 10, 15); // lunedì

describe('creaAzione', () => {
  it('è attiva se ci sono meno di 3 attive, altrimenti va in palude', () => {
    const input = { id: 'x', quando: ' q ', faro: ' f ', versione2min: 'v', tipo: 'singola' as const };
    const a = creaAzione(input, 2, ADESSO);
    expect(a.stato).toBe('attiva');
    expect(a.quando).toBe('q');
    expect(a.livello).toBe(0);
    expect(a.prossimaComparsa).toBe(ADESSO);
    expect(creaAzione(input, 3, ADESSO).stato).toBe('palude');
  });
});

describe('ricorrenti: ritmo e livelli', () => {
  it('gli intervalli sono 1, 2, 4, 7, 14, 30 giorni', () => {
    expect(INTERVALLI_GIORNI).toEqual([1, 2, 4, 7, 14, 30]);
  });

  it('ogni Fatta alza il livello e sposta la prossima comparsa secondo il nuovo livello', () => {
    let a = azione({ nonAncoraDiFila: 2 });
    const attesi = [
      [1, d(2026, 11, 4)],
      [2, d(2026, 11, 6)],
      [3, d(2026, 11, 9)],
      [4, d(2026, 11, 16)],
    ] as const;
    for (const [livello, prossima] of attesi) {
      const r = segnaFatta(a, ADESSO);
      expect(r.chiediAbitudine).toBe(false);
      expect(r.azione.livello).toBe(livello);
      expect(r.azione.prossimaComparsa).toBe(prossima);
      expect(r.azione.nonAncoraDiFila).toBe(0);
      a = r.azione;
    }
  });

  it('al quinto Fatta chiede se è diventata abitudine', () => {
    const r = segnaFatta(azione({ livello: 4 }), ADESSO);
    expect(r.chiediAbitudine).toBe(true);
    expect(r.azione.livello).toBe(5);
    expect(r.azione.inAttesaAbitudine).toBe(true);
    expect(inScadenza(r.azione, ADESSO + 100 * 86_400_000)).toBe(false);
  });

  it('sì -> abitudine con ricontrollo ogni 30 giorni', () => {
    const r = segnaFatta(azione({ livello: 4 }), ADESSO);
    const a = rispondiAbitudine(r.azione, true, ADESSO);
    expect(a.stato).toBe('abitudine');
    expect(a.inAttesaAbitudine).toBeUndefined();
    expect(a.prossimaComparsa).toBe(d(2026, 12, 2));
    // Fatta su un'abitudine: altri 30 giorni, resta abitudine
    const b = segnaFatta(a, d(2026, 12, 2, 9)).azione;
    expect(b.stato).toBe('abitudine');
    expect(b.prossimaComparsa).toBe(d(2027, 1, 1));
  });

  it('no -> torna al livello 3 (7 giorni)', () => {
    const r = segnaFatta(azione({ livello: 4 }), ADESSO);
    const a = rispondiAbitudine(r.azione, false, ADESSO);
    expect(a.stato).toBe('attiva');
    expect(a.livello).toBe(3);
    expect(a.prossimaComparsa).toBe(d(2026, 11, 9));
  });
});

describe('singole', () => {
  it('Fatta -> stato fatta e libera il posto', () => {
    const a = azione({ tipo: 'singola' });
    const r = segnaFatta(a, ADESSO);
    expect(r.azione.stato).toBe('fatta');
    expect(r.chiediAbitudine).toBe(false);
    const altre = [azione(), azione(), r.azione];
    expect(attiva(azione({ stato: 'palude' }), altre, ADESSO).ok).toBe(true);
  });
});

describe('Non ancora, Più tardi, La faccio alle...', () => {
  it('Non ancora: domani, livello invariato, conta di fila; al terzo propone alternative', () => {
    let a = azione({ livello: 2 });
    for (let i = 1; i <= 3; i++) {
      const r = segnaNonAncora(a, ADESSO);
      expect(r.azione.livello).toBe(2);
      expect(r.azione.nonAncoraDiFila).toBe(i);
      expect(r.azione.prossimaComparsa).toBe(d(2026, 11, 3));
      expect(r.proponiAlternative).toBe(i >= 3);
      a = r.azione;
    }
    expect(segnaFatta(a, ADESSO).azione.nonAncoraDiFila).toBe(0);
  });

  it('Più tardi: dopo 2 ore', () => {
    expect(segnaPiuTardi(azione(), ADESSO).prossimaComparsa).toBe(d(2026, 11, 2, 12, 15));
  });

  it('La faccio alle...: tra 30 minuti, stasera, domani', () => {
    const orari = { stasera: '20:30', domani: '09:00' };
    expect(orarioFaccioAlle('tra30', orari, ADESSO)).toBe(d(2026, 11, 2, 10, 45));
    expect(orarioFaccioAlle('stasera', orari, ADESSO)).toBe(d(2026, 11, 2, 20, 30));
    expect(orarioFaccioAlle('domani', orari, ADESSO)).toBe(d(2026, 11, 3, 9, 0));
    // stasera già passata -> tra 30 minuti
    expect(orarioFaccioAlle('stasera', orari, d(2026, 11, 2, 21))).toBe(d(2026, 11, 2, 21, 30));
    const a = segnaFaccioAlle(azione({ livello: 1, nonAncoraDiFila: 1 }), d(2026, 11, 2, 20, 30), ADESSO);
    expect(a.prossimaComparsa).toBe(d(2026, 11, 2, 20, 30));
    expect(a.livello).toBe(1);
    expect(a.nonAncoraDiFila).toBe(1);
  });
});

describe('massimo 3 attive', () => {
  it('rifiuta la quarta e dice quali sono attive', () => {
    const attive = [azione(), azione(), azione()];
    const nuova = azione({ stato: 'palude' });
    const r = attiva(nuova, [...attive, nuova], ADESSO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.attive.map((a) => a.id)).toEqual(attive.map((a) => a.id));
  });

  it('riattivare un\'azione già attiva non conta doppio', () => {
    const attive = [azione(), azione(), azione()];
    expect(attiva(attive[0], attive, ADESSO).ok).toBe(true);
  });
});

describe('inScadenza', () => {
  it('solo attive o abitudini con prossima comparsa passata', () => {
    expect(inScadenza(azione(), ADESSO)).toBe(true);
    expect(inScadenza(azione({ prossimaComparsa: ADESSO + 1 }), ADESSO)).toBe(false);
    expect(inScadenza(azione({ stato: 'palude' }), ADESSO)).toBe(false);
    expect(inScadenza(azione({ stato: 'abitudine' }), ADESSO)).toBe(true);
  });
});
