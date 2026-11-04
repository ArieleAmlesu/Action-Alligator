import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { leggiDati } from '../lib/storage';
import {
  apriTana,
  assicuraBattito,
  battito,
  gestisciAllarme,
  notificaChiusa,
  notificaCliccata,
  ripianificaOggi,
} from '../lib/promemoria';
import { sincronizzaPostit } from '../lib/postit';
import type { Impostazioni } from '../core/types';

export default defineBackground({
  type: 'module',
  main() {
    // In MV3 gli ascoltatori vanno registrati subito, in modo sincrono.
    browser.alarms.onAlarm.addListener((alarm) => {
      void gestisciAllarme(alarm.name);
    });

    browser.notifications.onClicked.addListener((id) => {
      void notificaCliccata(id);
    });

    browser.notifications.onClosed.addListener((id, byUser) => {
      void notificaChiusa(id, byUser);
    });

    browser.runtime.onMessage.addListener((msg: unknown) => {
      if (typeof msg === 'object' && msg !== null && (msg as { tipo?: string }).tipo === 'apriTana') {
        const azioneId = (msg as { azioneId?: unknown }).azioneId;
        void apriTana(typeof azioneId === 'string' ? azioneId : undefined);
      }
    });

    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.impostazioni) return;
      void sincronizzaPostit(changes.impostazioni.newValue as Impostazioni).catch(console.error);
    });

    const avvio = async () => {
      await assicuraBattito();
      await battito();
      const dati = await leggiDati();
      await sincronizzaPostit(dati.impostazioni).catch(console.error);
    };

    browser.runtime.onInstalled.addListener(() => {
      void avvio().then(() => ripianificaOggi());
    });
    browser.runtime.onStartup.addListener(() => {
      void avvio();
    });
  },
});
