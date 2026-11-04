import { browser } from 'wxt/browser';
import { umore } from '../../core/hunger';
import { silenzio, terminaSilenzio, MINUTI_SILENZIO } from '../../lib/operazioni';
import { AggiuntaVeloce } from '../../ui/AggiuntaVeloce';
import { Alligatore } from '../../ui/Alligatore';
import { formattaOra, minutiRimasti } from '../../ui/format';
import { useAdesso, useDati } from '../../ui/useDati';

export function Popup() {
  const dati = useDati();
  const adesso = useAdesso();
  if (!dati) return <main style={{ width: 360, minHeight: 200 }} aria-busy="true" />;

  const fino = dati.stato.silenzioFino && dati.stato.silenzioFino > adesso ? dati.stato.silenzioFino : undefined;

  async function apriTana() {
    await browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') });
    window.close();
  }

  return (
    <main style={{ width: 360, padding: 14 }}>
      <div className="riga" style={{ marginBottom: 10 }}>
        <Alligatore umore={umore(dati.stato.fame)} dimensione={40} />
        <h1 style={{ fontSize: '1.15rem', margin: 0, flex: 1 }}>Action Alligator</h1>
        <button type="button" onClick={() => void apriTana()}>
          Apri la Tana
        </button>
      </div>

      <section className="scheda" style={{ padding: 12 }} aria-labelledby="titolo-silenzio">
        <h2 id="titolo-silenzio" className="sr-only">
          Silenzio
        </h2>
        {fino ? (
          <div className="riga" style={{ justifyContent: 'space-between' }}>
            <span>
              Silenzio fino alle <strong>{formattaOra(fino)}</strong> ({minutiRimasti(fino, adesso)} min)
            </span>
            <button type="button" onClick={() => void terminaSilenzio()}>
              Termina
            </button>
          </div>
        ) : (
          <div className="riga" style={{ justifyContent: 'space-between' }}>
            <span className="muto piccolo">Niente notifiche per {MINUTI_SILENZIO} minuti, senza penalità.</span>
            <button type="button" className="primario" onClick={() => void silenzio()}>
              Silenzio
            </button>
          </div>
        )}
      </section>

      <section className="scheda" style={{ padding: 12, marginBottom: 0 }} aria-labelledby="titolo-aggiunta">
        <h2 id="titolo-aggiunta">Aggiunta veloce</h2>
        <AggiuntaVeloce fonti={dati.fonti} compatta />
      </section>
    </main>
  );
}
