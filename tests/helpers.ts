import { creaAzione } from '../src/core/rhythm';
import { IMPOSTAZIONI_PREDEFINITE, type Azione, type Impostazioni } from '../src/core/types';

/** Data locale: mese 1-12 per leggibilità. */
export function d(anno: number, mese: number, giorno: number, ore = 0, minuti = 0): number {
  return new Date(anno, mese - 1, giorno, ore, minuti).getTime();
}

let contatore = 0;
export function azione(over: Partial<Azione> = {}, adesso = d(2026, 11, 2, 10)): Azione {
  contatore += 1;
  return {
    ...creaAzione(
      { id: `a${contatore}`, quando: 'apro il portatile', faro: 'scrivo 3 priorità', versione2min: 'scrivo la prima', tipo: 'ricorrente' },
      0,
      adesso,
    ),
    ...over,
  };
}

export function impostazioni(over: Partial<Impostazioni> = {}): Impostazioni {
  return { ...structuredClone(IMPOSTAZIONI_PREDEFINITE), ...over };
}
