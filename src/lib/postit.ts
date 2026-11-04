// Post-it facoltativo: lo script viene registrato solo per i siti che hai
// scelto e per cui hai dato il permesso.

import { browser } from 'wxt/browser';
import { patternPerSito } from '../core/sites';
import type { Impostazioni } from '../core/types';

const ID_SCRIPT = 'postit';
const FILE_SCRIPT = 'content-scripts/postit.js';

/** Va chiamata da un clic dell'utente (Firefox lo richiede per i permessi). */
export function chiediPermessoSito(dominio: string): Promise<boolean> {
  return browser.permissions.request({ origins: patternPerSito(dominio) });
}

export async function revocaPermessoSito(dominio: string): Promise<void> {
  await browser.permissions.remove({ origins: patternPerSito(dominio) }).catch(() => false);
}

export async function haPermessoSito(dominio: string): Promise<boolean> {
  return browser.permissions.contains({ origins: patternPerSito(dominio) });
}

/** Allinea lo script registrato a impostazioni e permessi attuali. */
export async function sincronizzaPostit(imp: Impostazioni): Promise<void> {
  const registrati = await browser.scripting.getRegisteredContentScripts({ ids: [ID_SCRIPT] }).catch(() => []);
  if (registrati.length > 0) await browser.scripting.unregisterContentScripts({ ids: [ID_SCRIPT] });
  if (!imp.postit.attivo) return;

  const matches: string[] = [];
  for (const sito of imp.postit.siti) {
    if (await haPermessoSito(sito)) matches.push(...patternPerSito(sito));
  }
  if (matches.length === 0) return;

  await browser.scripting.registerContentScripts([
    { id: ID_SCRIPT, js: [FILE_SCRIPT], matches, runAt: 'document_idle', allFrames: false },
  ]);
}
