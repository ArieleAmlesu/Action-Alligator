import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { Dati } from '../core/io';
import { leggiDati } from '../lib/storage';

/** Dati sempre aggiornati: si ricaricano a ogni modifica dello storage. */
export function useDati(): Dati | null {
  const [dati, setDati] = useState<Dati | null>(null);
  useEffect(() => {
    let attivo = true;
    const carica = () => {
      void leggiDati().then((d) => {
        if (attivo) setDati(d);
      });
    };
    carica();
    const ascolta = (_: unknown, area: string) => {
      if (area === 'local') carica();
    };
    browser.storage.onChanged.addListener(ascolta);
    return () => {
      attivo = false;
      browser.storage.onChanged.removeListener(ascolta);
    };
  }, []);
  return dati;
}

/** "Adesso" che si aggiorna ogni 30 secondi. */
export function useAdesso(): number {
  const [adesso, setAdesso] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAdesso(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return adesso;
}
