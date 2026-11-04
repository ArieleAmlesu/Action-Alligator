// Utilità sul tempo, tutte pure e nel fuso orario locale.

import type { Finestra, Orario } from './types';

export const MINUTO = 60_000;
export const ORA = 60 * MINUTO;
export const GIORNO = 24 * ORA;

/** Mezzanotte locale del giorno che contiene `ms`. */
export function inizioGiorno(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Aggiunge `n` giorni di calendario (sicuro col cambio dell'ora legale). */
export function aggiungiGiorni(ms: number, n: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** "AAAA-MM-GG" in ora locale. */
export function chiaveGiorno(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${g}`;
}

/** Mezzanotte locale di una chiave "AAAA-MM-GG". */
export function daChiaveGiorno(chiave: string): number {
  const [a, m, g] = chiave.split('-').map(Number);
  return new Date(a, m - 1, g).getTime();
}

const RE_ORARIO = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function orarioValido(o: string): boolean {
  return RE_ORARIO.test(o);
}

/** "HH:MM" -> minuti dalla mezzanotte. */
export function minutiDaOrario(o: Orario): number {
  const m = RE_ORARIO.exec(o);
  if (!m) throw new Error(`Orario non valido: ${o}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minuti dalla mezzanotte locale per un timestamp. */
export function minutoDelGiorno(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/** Timestamp del giorno di `giornoMs` all'orario indicato. */
export function alOrario(giornoMs: number, o: Orario): number {
  const d = new Date(giornoMs);
  const min = minutiDaOrario(o);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d.getTime();
}

/**
 * Il minuto del giorno cade nella finestra? Le finestre possono scavalcare la
 * mezzanotte (es. 22:30 -> 07:30). Inizio incluso, fine esclusa.
 * Una finestra con da === a è vuota.
 */
export function minutoInFinestra(minuto: number, f: Finestra): boolean {
  const da = minutiDaOrario(f.da);
  const a = minutiDaOrario(f.a);
  if (da === a) return false;
  if (da < a) return minuto >= da && minuto < a;
  return minuto >= da || minuto < a;
}

export function inFinestra(ms: number, f: Finestra): boolean {
  return minutoInFinestra(minutoDelGiorno(ms), f);
}

export function eDomenica(ms: number): boolean {
  return new Date(ms).getDay() === 0;
}

/** Lunedì 00:00 della settimana che contiene `ms`. */
export function inizioSettimana(ms: number): number {
  const d = new Date(inizioGiorno(ms));
  const giorno = (d.getDay() + 6) % 7; // lunedì = 0
  return aggiungiGiorni(d.getTime(), -giorno);
}
