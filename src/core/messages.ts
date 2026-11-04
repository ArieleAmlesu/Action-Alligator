// Le frasi dell'alligatore. Tono pungente sull'AZIONE, mai sulla persona:
// niente insulti, niente vergogna. Anche il feroce propone sempre una via d'uscita.
//
// Variabili:
//   {azione}  il testo di "farò" dell'azione (inserito tra «»)
//   {giorni}  giorni di calendario dall'ultima Fatta
//   {volte}   per "sazio": azioni fatte questa settimana;
//             per gli altri stati: quante volte di fila l'azione è stata rimandata

import type { Umore } from './hunger';

export interface Variabili {
  azione: string;
  giorni: number;
  volte: number;
}

interface Frase {
  testo: string;
  /** La frase ha senso solo se la condizione è vera (es. "2 giorni", non "0 giorni"). */
  se?: (v: Variabili) => boolean;
}

const almenoDueGiorni = (v: Variabili) => v.giorni >= 2;
const almenoDueVolte = (v: Variabili) => v.volte >= 2;

export const FRASI: Record<Umore, Frase[]> = {
  sazio: [
    { testo: 'Pancia piena. Volta numero {volte} questa settimana: sta diventando tuo.', se: almenoDueVolte },
    { testo: '{volte} azioni fatte questa settimana. L\'alligatore sonnecchia felice.', se: almenoDueVolte },
    { testo: 'Digestione in corso. Intanto {azione} ti aspetta, con calma.' },
    { testo: 'Sazio e soddisfatto. {azione}: un altro boccone?' },
    { testo: 'Quando tutto va liscio, {azione} è il modo per tenerlo così.' },
    { testo: 'Niente fretta, solo un promemoria gentile: {azione}.' },
    { testo: 'Coda che scodinzola. Prossimo boccone: {azione}.' },
  ],
  vigile: [
    { testo: 'Oggi tocca a: {azione}. Fatta?' },
    { testo: 'Un occhio aperto su {azione}. Due minuti bastano per iniziare.' },
    { testo: 'L\'alligatore guarda la riva. Lì c\'è {azione}.' },
    { testo: '{azione}: l\'hai imparata, adesso usala.' },
    { testo: 'Piccolo spuntino in vista: {azione}.' },
    { testo: 'Hai letto, visto, ascoltato. Ora tocca a {azione}.' },
    { testo: '{azione} è già rimandata {volte} volte. Oggi è la volta buona?', se: almenoDueVolte },
  ],
  affamato: [
    { testo: '{giorni} giorni a digiuno. {azione} è ancora lì che aspetta.', se: almenoDueGiorni },
    { testo: '{giorni} giorni senza applicare niente. Ricominciamo da {azione}?', se: almenoDueGiorni },
    { testo: 'Rimandata {volte} volte. {azione} non si farà da sola.', se: almenoDueVolte },
    { testo: 'Lo stomaco brontola. {azione} resta in fondo alla lista da troppo.' },
    { testo: '{azione} sta diventando teoria. Bastano due minuti per riportarla in pratica.' },
    { testo: 'L\'alligatore sbadiglia, denti in mostra. {azione}: anche solo la versione da 2 minuti?' },
    { testo: 'Fame crescente. Un boccone piccolo va benissimo: {azione}.' },
  ],
  feroce: [
    { testo: 'Rimandata {volte} volte. Forse è troppo grande: la rimpiccioliamo?', se: almenoDueVolte },
    { testo: '{azione} è ferma da {giorni} giorni. Facciamo solo la versione da 2 minuti?', se: almenoDueGiorni },
    { testo: 'Denti in vista. {azione}: due minuti, e l\'alligatore torna buono.' },
    { testo: 'Fame da alligatore. Se {azione} non funziona, cambiamo momento o buttiamola.' },
    { testo: 'Il fiume è in piena. Basta un passo: la versione da 2 minuti di {azione}.' },
    { testo: '{azione} pesa troppo? Rimpiccioliscila o mettila in Palude: va bene lo stesso.' },
    { testo: 'Ruggito pronto. Un solo Fatta e torna la calma: {azione}.' },
  ],
};

/** Frasi brevi per la Tana quando non c'è nessuna azione da ricordare. */
export const STATO_SENZA_AZIONE: Record<Umore, string> = {
  sazio: 'Pancia piena, coda rilassata.',
  vigile: 'Occhi a pelo d\'acqua: pronto per la prossima azione.',
  affamato: 'Lo stomaco brontola. Basta una piccola azione per calmarlo.',
  feroce: 'Fame feroce. Una versione da 2 minuti è il modo più rapido per calmarlo.',
};

export function riempi(testo: string, v: Variabili): string {
  return testo
    .replaceAll('{azione}', `«${v.azione}»`)
    .replaceAll('{giorni}', String(v.giorni))
    .replaceAll('{volte}', String(v.volte));
}

/** Frasi utilizzabili per l'umore e le variabili date. */
export function frasiUtilizzabili(u: Umore, v: Variabili): string[] {
  return FRASI[u]
    .filter((f) => (f.se ? f.se(v) : true))
    .filter((f) => v.azione.trim() !== '' || !f.testo.includes('{azione}'))
    .map((f) => f.testo);
}

/** Sceglie e compone una frase. `casuale` è iniettabile per i test. */
export function componiMessaggio(u: Umore, v: Variabili, casuale: () => number = Math.random): string {
  const frasi = frasiUtilizzabili(u, v);
  if (frasi.length === 0) return STATO_SENZA_AZIONE[u];
  return riempi(frasi[Math.floor(casuale() * frasi.length)] ?? frasi[0]!, v);
}
