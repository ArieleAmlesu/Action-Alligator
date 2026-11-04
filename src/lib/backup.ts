// Copia di sicurezza dei dati: scarica un file JSON e ricorda quando l'hai fatta.

import { esporta } from '../core/io';
import { GIORNI_RIMANDO_BACKUP } from '../core/stats';
import { GIORNO } from '../core/time';
import { inCoda, leggiDati, scriviDati } from './storage';

/** Scarica il backup (va chiamata da un clic) e annota la data. */
export async function scaricaBackup(): Promise<void> {
  const adesso = Date.now();
  const dati = await leggiDati();
  const stato = { ...dati.stato, ultimoBackup: adesso };
  delete stato.backupRimandatoFino;
  const json = JSON.stringify(esporta({ ...dati, stato }, adesso), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `action-alligator-${new Date(adesso).toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  await inCoda(async () => {
    const attuale = await leggiDati();
    const s = { ...attuale.stato, ultimoBackup: adesso };
    delete s.backupRimandatoFino;
    await scriviDati({ stato: s });
  });
}

/** "Più tardi" sul promemoria di backup: non lo ripropone per qualche giorno. */
export function rimandaBackup(): Promise<void> {
  return inCoda(async () => {
    const dati = await leggiDati();
    await scriviDati({ stato: { ...dati.stato, backupRimandatoFino: Date.now() + GIORNI_RIMANDO_BACKUP * GIORNO } });
  });
}
