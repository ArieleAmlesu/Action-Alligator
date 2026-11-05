// Post-it: un riquadro piccolo nell'angolo, chiudibile, isolato in Shadow DOM.
// Non copre il contenuto, non ferma video, non tocca la pagina.

import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { scegliAzioneDaRicordare } from '../core/scheduler';
import type { Azione } from '../core/types';

export default defineContentScript({
  // Registrato a runtime solo sui siti scelti nelle impostazioni.
  registration: 'runtime',
  matches: [],
  async main() {
    if (window.top !== window) return;
    const r = await browser.storage.local.get('azioni');
    const azione = scegliAzioneDaRicordare((r.azioni as Azione[] | undefined) ?? [], Date.now());
    if (!azione) return;
    mostraPostit(azione);
  },
});

function mostraPostit(azione: Azione) {
  const host = document.createElement('action-alligator-postit');
  const shadow = host.attachShadow({ mode: 'closed' });

  const stile = document.createElement('style');
  stile.textContent = `
    :host { all: initial; }
    .box {
      position: fixed; left: 12px; bottom: 12px; z-index: 2147483646;
      max-width: 240px; padding: 8px 10px; border-radius: 10px;
      background: #f3fbe9; color: #13261a; border: 1px solid #8bc34a;
      box-shadow: 0 2px 8px rgba(0,0,0,.15);
      font: 13px/1.35 system-ui, sans-serif; opacity: .95;
    }
    .riga { display: flex; gap: 6px; align-items: flex-start; }
    .testo { flex: 1; }
    .titolo { font-weight: 600; color: #1e5e3a; display: block; margin-bottom: 2px; }
    button {
      font: inherit; cursor: pointer; border-radius: 6px; border: 1px solid #1e5e3a;
      background: transparent; color: #1e5e3a; padding: 2px 6px;
    }
    button:focus-visible { outline: 2px solid #1e5e3a; outline-offset: 2px; }
    .chiudi { border: none; font-size: 16px; line-height: 1; padding: 0 4px; }
    .apri { margin-top: 6px; }
  `;

  const box = document.createElement('div');
  box.className = 'box';
  box.setAttribute('role', 'note');
  box.setAttribute('aria-label', 'Promemoria di Action Alligator');

  const riga = document.createElement('div');
  riga.className = 'riga';
  const testo = document.createElement('div');
  testo.className = 'testo';
  const titolo = document.createElement('span');
  titolo.className = 'titolo';
  titolo.textContent = 'Oggi tocca a:';
  testo.append(titolo, document.createTextNode(azione.faro));

  const chiudi = document.createElement('button');
  chiudi.className = 'chiudi';
  chiudi.type = 'button';
  chiudi.textContent = '×';
  chiudi.setAttribute('aria-label', 'Chiudi il post-it');
  chiudi.addEventListener('click', () => host.remove());
  riga.append(testo, chiudi);

  const apri = document.createElement('button');
  apri.className = 'apri';
  apri.type = 'button';
  apri.textContent = 'Apri la Tana';
  apri.addEventListener('click', () => {
    void browser.runtime.sendMessage({ tipo: 'apriTana', azioneId: azione.id });
    host.remove();
  });

  box.append(riga, apri);
  shadow.append(stile, box);

  // A schermo intero (es. un video) il post-it sparisce.
  const aggiorna = () => {
    box.style.display = document.fullscreenElement ? 'none' : '';
  };
  document.addEventListener('fullscreenchange', aggiorna);

  document.documentElement.append(host);
}
