import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { esporta, importa, type Dati } from '../../core/io';
import { normalizzaSito } from '../../core/sites';
import { minutiDaOrario, orarioValido } from '../../core/time';
import type { Finestra, Impostazioni as TipoImpostazioni } from '../../core/types';
import { salvaImpostazioni, sostituisciTuttiIDati } from '../../lib/operazioni';
import { chiediPermessoSito, haPermessoSito, revocaPermessoSito } from '../../lib/postit';
import { leggiDati } from '../../lib/storage';
import { useDati } from '../../ui/useDati';

export function Impostazioni() {
  const dati = useDati();
  if (!dati) return <main className="contenitore" aria-busy="true" />;
  return (
    <main className="contenitore" style={{ maxWidth: 720 }}>
      <div className="riga" style={{ marginBottom: 8 }}>
        <img src="/img/alligatore.webp" alt="" width={44} height={44} style={{ borderRadius: 12 }} />
        <h1 style={{ margin: 0 }}>Impostazioni</h1>
      </div>
      <p className="muto">
        Tutto resta su questo computer, in Firefox. Nessun dato esce dall'estensione.
      </p>
      <Orari impostazioni={dati.impostazioni} />
      <PostIt impostazioni={dati.impostazioni} />
      <DatiSezione />
    </main>
  );
}

function Orari({ impostazioni }: { impostazioni: TipoImpostazioni }) {
  const id = useId();
  const [bozza, setBozza] = useState(impostazioni);
  const [esito, setEsito] = useState('');

  // Se le impostazioni cambiano altrove (es. import), riparti da quelle.
  useEffect(() => setBozza(impostazioni), [impostazioni]);

  const errori: string[] = [];
  const tutti = [bozza.orariAttivi, ...bozza.finestreSilenzio];
  if (tutti.some((f) => !orarioValido(f.da) || !orarioValido(f.a))) errori.push('Completa tutti gli orari.');
  else if (minutiDaOrario(bozza.orariAttivi.da) >= minutiDaOrario(bozza.orariAttivi.a))
    errori.push("Gli orari attivi devono finire dopo l'inizio (stesso giorno).");
  if (!orarioValido(bozza.orariFaccioAlle.stasera) || !orarioValido(bozza.orariFaccioAlle.domani))
    errori.push('Completa gli orari di "La faccio alle…".');

  async function salva(e: FormEvent) {
    e.preventDefault();
    if (errori.length) return;
    const attuali = (await leggiDati()).impostazioni;
    await salvaImpostazioni({ ...bozza, postit: attuali.postit });
    setEsito('Salvate. I promemoria di oggi sono stati ripianificati.');
  }

  const aggiornaFinestra = (i: number, f: Finestra) =>
    setBozza((b) => ({ ...b, finestreSilenzio: b.finestreSilenzio.map((x, j) => (j === i ? f : x)) }));

  return (
    <form className="scheda" onSubmit={salva} aria-labelledby={`${id}-titolo`}>
      <h2 id={`${id}-titolo`}>Quando può farsi sentire</h2>

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Orari attivi</legend>
        <p className="muto piccolo">I promemoria casuali arrivano solo in questa fascia.</p>
        <div className="riga">
          <label htmlFor={`${id}-da`} style={{ margin: 0 }}>
            Dalle
          </label>
          <input
            id={`${id}-da`}
            type="time"
            value={bozza.orariAttivi.da}
            onChange={(e) => setBozza({ ...bozza, orariAttivi: { ...bozza.orariAttivi, da: e.target.value } })}
            required
          />
          <label htmlFor={`${id}-a`} style={{ margin: 0 }}>
            alle
          </label>
          <input
            id={`${id}-a`}
            type="time"
            value={bozza.orariAttivi.a}
            onChange={(e) => setBozza({ ...bozza, orariAttivi: { ...bozza.orariAttivi, a: e.target.value } })}
            required
          />
        </div>
      </fieldset>

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Finestre di silenzio</legend>
        <p className="muto piccolo">Mai notifiche in queste fasce. Possono scavalcare la mezzanotte (es. 22:30 → 07:30).</p>
        <ul className="pulita">
          {bozza.finestreSilenzio.map((f, i) => (
            <li key={i} className="riga">
              <label htmlFor={`${id}-s${i}-da`} style={{ margin: 0 }}>
                Dalle
              </label>
              <input id={`${id}-s${i}-da`} type="time" value={f.da} onChange={(e) => aggiornaFinestra(i, { ...f, da: e.target.value })} required />
              <label htmlFor={`${id}-s${i}-a`} style={{ margin: 0 }}>
                alle
              </label>
              <input id={`${id}-s${i}-a`} type="time" value={f.a} onChange={(e) => aggiornaFinestra(i, { ...f, a: e.target.value })} required />
              <button
                type="button"
                className="pericolo"
                aria-label={`Rimuovi la finestra ${f.da}–${f.a}`}
                onClick={() => setBozza((b) => ({ ...b, finestreSilenzio: b.finestreSilenzio.filter((_, j) => j !== i) }))}
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          style={{ marginTop: 8 }}
          onClick={() => setBozza((b) => ({ ...b, finestreSilenzio: [...b.finestreSilenzio, { da: '12:30', a: '14:00' }] }))}
        >
          + Aggiungi finestra
        </button>
      </fieldset>

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>"La faccio alle…"</legend>
        <div className="riga">
          <label htmlFor={`${id}-sera`} style={{ margin: 0 }}>
            Stasera alle
          </label>
          <input
            id={`${id}-sera`}
            type="time"
            value={bozza.orariFaccioAlle.stasera}
            onChange={(e) => setBozza({ ...bozza, orariFaccioAlle: { ...bozza.orariFaccioAlle, stasera: e.target.value } })}
            required
          />
          <label htmlFor={`${id}-domani`} style={{ margin: 0 }}>
            Domani alle
          </label>
          <input
            id={`${id}-domani`}
            type="time"
            value={bozza.orariFaccioAlle.domani}
            onChange={(e) => setBozza({ ...bozza, orariFaccioAlle: { ...bozza.orariFaccioAlle, domani: e.target.value } })}
            required
          />
        </div>
      </fieldset>

      {errori.map((e) => (
        <p key={e} className="avviso" role="alert">
          {e}
        </p>
      ))}
      <div className="riga">
        <button type="submit" className="primario" disabled={errori.length > 0}>
          Salva orari
        </button>
        <span className="muto piccolo messaggio-stato" role="status">
          {esito}
        </span>
      </div>
    </form>
  );
}

function PostIt({ impostazioni }: { impostazioni: TipoImpostazioni }) {
  const id = useId();
  const [nuovo, setNuovo] = useState('');
  const [esito, setEsito] = useState('');
  const [permessi, setPermessi] = useState<Record<string, boolean>>({});
  const { attivo, siti } = impostazioni.postit;

  useEffect(() => {
    let vivo = true;
    void Promise.all(siti.map(async (s) => [s, await haPermessoSito(s)] as const)).then((r) => {
      if (vivo) setPermessi(Object.fromEntries(r));
    });
    return () => {
      vivo = false;
    };
  }, [siti]);

  async function salvaPostit(postit: TipoImpostazioni['postit']) {
    const attuali = (await leggiDati()).impostazioni;
    await salvaImpostazioni({ ...attuali, postit });
  }

  function aggiungi(e: FormEvent) {
    e.preventDefault();
    const dominio = normalizzaSito(nuovo);
    if (!dominio) {
      setEsito('Scrivi un sito valido, per esempio youtube.com');
      return;
    }
    // La richiesta di permesso deve partire subito dal clic.
    void chiediPermessoSito(dominio).then(async (ok) => {
      if (!ok) {
        setEsito(`Permesso per ${dominio} non concesso: il post-it non comparirà lì.`);
        return;
      }
      await salvaPostit({ attivo, siti: [...new Set([...siti, dominio])] });
      setNuovo('');
      setEsito(`Post-it attivo su ${dominio}.`);
    });
  }

  function concedi(dominio: string) {
    void chiediPermessoSito(dominio).then((ok) => {
      setPermessi((p) => ({ ...p, [dominio]: ok }));
      // Risalvare fa ri-registrare lo script con il nuovo permesso.
      if (ok) void salvaPostit({ attivo, siti });
    });
  }

  async function rimuovi(dominio: string) {
    await revocaPermessoSito(dominio);
    await salvaPostit({ attivo, siti: siti.filter((s) => s !== dominio) });
    setEsito(`Rimosso ${dominio} e revocato il permesso.`);
  }

  return (
    <section className="scheda" aria-labelledby={`${id}-titolo`}>
      <h2 id={`${id}-titolo`}>Post-it sui siti (facoltativo)</h2>
      <p className="muto piccolo">
        Un riquadro piccolo nell'angolo in basso a sinistra, con l'azione del momento. Si chiude con un clic, sparisce a
        schermo intero e non ferma mai i video. L'estensione chiede il permesso solo per i siti che aggiungi qui.
      </p>
      <label className="riga" style={{ fontWeight: 400 }}>
        <input type="checkbox" checked={attivo} onChange={(e) => void salvaPostit({ attivo: e.target.checked, siti })} />
        Mostra il post-it sui siti scelti
      </label>

      {attivo && (
        <>
          <ul className="pulita" style={{ margin: '10px 0' }}>
            {siti.map((s) => (
              <li key={s} className="riga" style={{ justifyContent: 'space-between' }}>
                <span>
                  {s}
                  {permessi[s] === false && <span className="etichetta oggi" style={{ marginLeft: 8 }}>permesso mancante</span>}
                </span>
                <span className="riga">
                  {permessi[s] === false && (
                    <button type="button" onClick={() => concedi(s)}>
                      Concedi permesso
                    </button>
                  )}
                  <button type="button" className="pericolo" onClick={() => void rimuovi(s)}>
                    Rimuovi
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={aggiungi} className="riga">
            <label htmlFor={`${id}-sito`} className="sr-only">
              Sito da aggiungere
            </label>
            <input
              id={`${id}-sito`}
              value={nuovo}
              onChange={(e) => setNuovo(e.target.value)}
              placeholder="es. youtube.com"
              style={{ flex: 1, minWidth: 180 }}
            />
            <button type="submit">Aggiungi sito</button>
          </form>
        </>
      )}
      <p className="muto piccolo messaggio-stato" role="status">
        {esito}
      </p>
    </section>
  );
}

function DatiSezione() {
  const id = useId();
  const [esito, setEsito] = useState('');
  const [inArrivo, setInArrivo] = useState<Dati | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function esportaFile() {
    const dati = await leggiDati();
    const json = JSON.stringify(esporta(dati, Date.now()), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-alligator-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setEsito('Export pronto: controlla i download.');
  }

  async function scegliFile(file: File | undefined) {
    if (!file) return;
    const r = importa(await file.text());
    if (!r.ok) {
      setInArrivo(null);
      setEsito(r.errore);
      return;
    }
    setInArrivo(r.dati);
    setEsito('');
  }

  async function conferma() {
    if (!inArrivo) return;
    await sostituisciTuttiIDati(inArrivo);
    setInArrivo(null);
    setEsito('Dati importati.');
  }

  return (
    <section className="scheda" aria-labelledby={`${id}-titolo`}>
      <h2 id={`${id}-titolo`}>I tuoi dati</h2>
      <p className="muto piccolo">Esporta prima di ogni aggiornamento dell'estensione, così hai sempre una copia.</p>
      <div className="riga">
        <button type="button" onClick={() => void esportaFile()}>
          Esporta JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Importa JSON…
        </button>
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept="application/json,.json"
          hidden
          tabIndex={-1}
          aria-label="File JSON da importare"
          onChange={(e) => {
            void scegliFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {inArrivo && (
        <div className="avviso" role="alert">
          <p>
            Il file contiene {inArrivo.azioni.length} azioni, {inArrivo.fonti.length} fonti e {inArrivo.eventi.length} eventi.
            Importandolo <strong>sostituisci tutti i dati attuali</strong>.
          </p>
          <div className="riga">
            <button type="button" className="primario" onClick={() => void conferma()}>
              Sostituisci i dati
            </button>
            <button type="button" onClick={() => setInArrivo(null)}>
              Annulla
            </button>
          </div>
        </div>
      )}
      <p className="muto piccolo messaggio-stato" role="status">
        {esito}
      </p>
    </section>
  );
}
