import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { ETICHETTE_UMORE, giorniDiDigiuno, umore, type Umore } from '../../core/hunger';
import type { Dati } from '../../core/io';
import { componiMessaggio, STATO_SENZA_AZIONE } from '../../core/messages';
import { inScadenza, SOGLIA_NON_ANCORA, type SceltaFaccioAlle } from '../../core/rhythm';
import { scegliAzioneDaRicordare } from '../../core/scheduler';
import { numeriSettimana, proponiRevisione } from '../../core/stats';
import type { Azione, Fonte } from '../../core/types';
import {
  attivaAzione,
  chiudiAzione,
  faccioAlle,
  fatta,
  nonAncora,
  piuTardi,
  rispondiDomandaAbitudine,
  segnaRevisioneFatta,
  terminaSilenzio,
} from '../../lib/operazioni';
import { AggiuntaVeloce } from '../../ui/AggiuntaVeloce';
import { Alligatore } from '../../ui/Alligatore';
import { ModificaAzione, ScegliQualeChiudere, type CampoDaModificare } from '../../ui/Dialoghi';
import { formattaOra, formattaQuando, minutiRimasti } from '../../ui/format';
import { useAdesso, useDati } from '../../ui/useDati';

type Vista = 'tana' | 'palude' | 'pancia';

function vistaDaHash(): Vista {
  const h = location.hash.replace('#', '');
  return h === 'palude' || h === 'pancia' ? h : 'tana';
}

export function Tana() {
  const dati = useDati();
  const adesso = useAdesso();
  const [vista, setVista] = useState<Vista>(vistaDaHash);
  const [evidenziata] = useState(() => new URLSearchParams(location.search).get('azione'));
  const [modifica, setModifica] = useState<{ azione: Azione; focus: CampoDaModificare } | null>(null);
  const [daAttivare, setDaAttivare] = useState<string | null>(null);

  useEffect(() => {
    const f = () => setVista(vistaDaHash());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  useEffect(() => {
    if (!dati || !evidenziata) return;
    document.getElementById(`azione-${evidenziata}`)?.scrollIntoView({ block: 'center' });
    document.getElementById(`azione-${evidenziata}`)?.focus();
  }, [dati !== null, evidenziata]);

  if (!dati) return <main className="contenitore" aria-busy="true" />;

  const attive = dati.azioni.filter((a) => a.stato === 'attiva');

  async function attivaConControllo(id: string) {
    const r = await attivaAzione(id);
    if (!r.ok) setDaAttivare(id);
  }

  const apriModifica = (azione: Azione, focus: CampoDaModificare) => setModifica({ azione, focus });

  return (
    <main className="contenitore">
      <Intestazione dati={dati} adesso={adesso} vista={vista} />

      {vista === 'tana' && (
        <VistaTana
          dati={dati}
          adesso={adesso}
          evidenziata={evidenziata}
          onModifica={apriModifica}
          onAttiva={attivaConControllo}
        />
      )}
      {vista === 'palude' && <VistaPalude dati={dati} onAttiva={attivaConControllo} onModifica={apriModifica} />}
      {vista === 'pancia' && <VistaPancia dati={dati} />}

      <ModificaAzione azione={modifica?.azione ?? null} focus={modifica?.focus} onChiudi={() => setModifica(null)} />
      <ScegliQualeChiudere
        aperto={daAttivare !== null}
        attive={attive}
        onChiudi={() => setDaAttivare(null)}
        onLiberato={() => {
          const id = daAttivare;
          setDaAttivare(null);
          if (id) void attivaAzione(id);
        }}
      />
    </main>
  );
}

function Intestazione({ dati, adesso, vista }: { dati: Dati; adesso: number; vista: Vista }) {
  const u = umore(dati.stato.fame);
  const frase = useMemo(() => {
    const azione = scegliAzioneDaRicordare(dati.azioni, adesso);
    if (!azione) return STATO_SENZA_AZIONE[u];
    return componiMessaggio(u, {
      azione: azione.faro,
      giorni: giorniDiDigiuno(dati.eventi, adesso),
      volte: u === 'sazio' ? numeriSettimana(dati.fonti, dati.eventi, adesso).azioniFatte : azione.nonAncoraDiFila,
    });
    // La frase cambia solo quando cambia l'umore o l'elenco delle azioni.
  }, [u, dati.azioni]);
  const silenzioFino = dati.stato.silenzioFino && dati.stato.silenzioFino > adesso ? dati.stato.silenzioFino : undefined;

  return (
    <header className="scheda" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <Alligatore umore={u} dimensione={96} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <h1>La Tana</h1>
        <p style={{ fontSize: '1.1rem' }}>{frase}</p>
        <BarraFame fame={dati.stato.fame} umore={u} />
        {silenzioFino && (
          <p className="piccolo muto" style={{ marginTop: 6 }}>
            Silenzio fino alle {formattaOra(silenzioFino)} ({minutiRimasti(silenzioFino, adesso)} min).{' '}
            <button type="button" className="collegamento" onClick={() => void terminaSilenzio()}>
              Termina
            </button>
          </p>
        )}
      </div>
      <nav aria-label="Sezioni" className="riga" style={{ alignSelf: 'flex-start' }}>
        {vista !== 'tana' && (
          <a className="bottone" href="#">
            ← Tana
          </a>
        )}
        <button type="button" onClick={() => void browser.runtime.openOptionsPage()}>
          Impostazioni
        </button>
      </nav>
    </header>
  );
}

function BarraFame({ fame, umore: u }: { fame: number; umore: Umore }) {
  return (
    <div>
      <div className="riga piccolo muto" style={{ justifyContent: 'space-between' }}>
        <span>
          Umore: <strong>{ETICHETTE_UMORE[u]}</strong>
        </span>
        <span>Fame {String(fame).replace('.', ',')}/10</span>
      </div>
      <div
        className={`fame-barra ${u}`}
        role="meter"
        aria-label="Fame dell'alligatore"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={fame}
      >
        <span style={{ width: `${fame * 10}%` }} />
      </div>
    </div>
  );
}

function VistaTana({
  dati,
  adesso,
  evidenziata,
  onModifica,
  onAttiva,
}: {
  dati: Dati;
  adesso: number;
  evidenziata: string | null;
  onModifica: (a: Azione, f: CampoDaModificare) => void;
  onAttiva: (id: string) => Promise<void>;
}) {
  const attive = dati.azioni.filter((a) => a.stato === 'attiva');
  const inAttesaAbitudine = dati.azioni.filter((a) => a.inAttesaAbitudine);
  const abitudiniDaRicontrollare = dati.azioni.filter((a) => a.stato === 'abitudine' && inScadenza(a, adesso));
  const palude = dati.azioni.filter((a) => a.stato === 'palude');
  const pancia = dati.azioni.filter((a) => a.stato === 'fatta');
  const settimana = numeriSettimana(dati.fonti, dati.eventi, adesso);
  const fonti = new Map(dati.fonti.map((f) => [f.id, f]));

  return (
    <>
      {inAttesaAbitudine.map((a) => (
        <DomandaAbitudine key={a.id} azione={a} />
      ))}

      {proponiRevisione(dati.stato, adesso) && <Revisione dati={dati} onAttiva={onAttiva} />}

      <section aria-labelledby="titolo-attive">
        <h2 id="titolo-attive">Le tue azioni ({attive.length}/3)</h2>
        {attive.length === 0 && (
          <div className="scheda">
            <h3>Nessuna azione attiva</h3>
            <p>
              Pensa all'ultima cosa che hai letto, visto o imparato. Qual è <strong>una</strong> cosa concreta che puoi fare
              grazie a quella? Scrivila qui sotto: quando la farai, cosa farai e la versione da 2 minuti.
            </p>
            <a className="bottone" href="#aggiungi">
              Aggiungi la prima azione ↓
            </a>
          </div>
        )}
        {attive.map((a) => (
          <SchedaAzione
            key={a.id}
            azione={a}
            fonte={a.fonteId ? fonti.get(a.fonteId) : undefined}
            adesso={adesso}
            evidenziata={evidenziata === a.id}
            orari={dati.impostazioni.orariFaccioAlle}
            onModifica={onModifica}
          />
        ))}
      </section>

      {abitudiniDaRicontrollare.length > 0 && (
        <section aria-labelledby="titolo-abitudini">
          <h2 id="titolo-abitudini">Abitudini da ricontrollare</h2>
          <p className="muto piccolo">Ogni 30 giorni l'alligatore controlla che siano ancora lì.</p>
          {abitudiniDaRicontrollare.map((a) => (
            <SchedaAzione
              key={a.id}
              azione={a}
              fonte={a.fonteId ? fonti.get(a.fonteId) : undefined}
              adesso={adesso}
              evidenziata={evidenziata === a.id}
              orari={dati.impostazioni.orariFaccioAlle}
              onModifica={onModifica}
            />
          ))}
        </section>
      )}

      <section className="scheda" aria-labelledby="titolo-settimana">
        <h2 id="titolo-settimana">Questa settimana</h2>
        <div className="griglia-2">
          <p>
            <strong style={{ fontSize: '1.6rem' }}>{settimana.fontiAggiunte}</strong> fonti aggiunte
          </p>
          <p>
            <strong style={{ fontSize: '1.6rem' }}>{settimana.azioniFatte}</strong> azioni fatte
          </p>
        </div>
        {settimana.fontiAggiunte > settimana.azioniFatte && (
          <p className="muto piccolo">Più cose imparate che applicate: la prossima Fatta pareggia un po' i conti.</p>
        )}
      </section>

      <section className="scheda" id="aggiungi" aria-labelledby="titolo-aggiungi">
        <h2 id="titolo-aggiungi">Aggiunta veloce</h2>
        <AggiuntaVeloce fonti={dati.fonti} />
      </section>

      <nav aria-label="Altre sezioni" className="riga">
        <a className="bottone" href="#palude">
          Palude ({palude.length})
        </a>
        <a className="bottone" href="#pancia">
          Pancia ({pancia.length})
        </a>
      </nav>
    </>
  );
}

function SchedaAzione({
  azione,
  fonte,
  adesso,
  evidenziata,
  orari,
  onModifica,
}: {
  azione: Azione;
  fonte?: Fonte;
  adesso: number;
  evidenziata: boolean;
  orari: { stasera: string; domani: string };
  onModifica: (a: Azione, f: CampoDaModificare) => void;
}) {
  const [menuOrario, setMenuOrario] = useState(false);
  const [esito, setEsito] = useState('');
  const dovuta = azione.prossimaComparsa <= adesso;
  const proponi = azione.nonAncoraDiFila >= SOGLIA_NON_ANCORA;

  async function esegui(fn: () => Promise<string>) {
    try {
      setEsito(await fn());
    } catch {
      setEsito('Qualcosa è andato storto. Riprova.');
    }
  }

  const onFatta = () =>
    esegui(async () => {
      const r = await fatta(azione.id);
      return r.chiediAbitudine ? '' : 'Fatta! L\'alligatore ringrazia.';
    });
  const onNonAncora = () =>
    esegui(async () => {
      await nonAncora(azione.id);
      return 'Ok, torna domani.';
    });
  const onPiuTardi = () =>
    esegui(async () => {
      const t = await piuTardi(azione.id);
      return `Te la ricordo alle ${formattaOra(t)}.`;
    });
  const onFaccioAlle = (s: SceltaFaccioAlle) =>
    esegui(async () => {
      const t = await faccioAlle(azione.id, s);
      setMenuOrario(false);
      return `Promemoria ${formattaQuando(t, Date.now())}.`;
    });

  return (
    <article
      id={`azione-${azione.id}`}
      className={`scheda${evidenziata ? ' evidenziata' : ''}`}
      tabIndex={-1}
      aria-labelledby={`titolo-${azione.id}`}
    >
      <div className="riga" style={{ justifyContent: 'space-between' }}>
        <span className="muto piccolo">
          Quando {azione.quando}
          {fonte && <> · da «{fonte.titolo}»</>}
        </span>
        <span className={`etichetta${dovuta ? ' oggi' : ''}`}>
          {dovuta ? 'Da fare' : `Torna ${formattaQuando(azione.prossimaComparsa, adesso)}`}
        </span>
      </div>
      <h3 id={`titolo-${azione.id}`} style={{ fontSize: '1.2rem', margin: '6px 0' }}>
        {azione.faro}
      </h3>
      <p className="muto piccolo">
        Versione da 2 minuti: {azione.versione2min}
        {azione.tipo === 'ricorrente' && azione.stato === 'attiva' && <> · livello {azione.livello}/5</>}
        {azione.tipo === 'singola' && <> · una volta sola</>}
      </p>

      {proponi && (
        <div className="avviso" role="note">
          <p>
            Rimandata {azione.nonAncoraDiFila} volte di fila. Forse così com'è non funziona: cambiamola.
          </p>
          <div className="riga">
            <button type="button" onClick={() => onModifica(azione, 'versione2min')}>
              Rimpicciolisci
            </button>
            <button type="button" onClick={() => onModifica(azione, 'quando')}>
              Cambia momento
            </button>
            <button type="button" className="pericolo" onClick={() => void chiudiAzione(azione.id, 'butta')}>
              Butta
            </button>
          </div>
        </div>
      )}

      <div className="riga" style={{ marginTop: 8 }}>
        <button type="button" className="primario" onClick={onFatta}>
          Fatta
        </button>
        <button type="button" onClick={onNonAncora}>
          Non ancora
        </button>
        <button type="button" onClick={onPiuTardi}>
          Più tardi
        </button>
        <button type="button" aria-expanded={menuOrario} onClick={() => setMenuOrario((m) => !m)}>
          La faccio alle…
        </button>
        <button type="button" className="collegamento piccolo" onClick={() => onModifica(azione, 'faro')}>
          Modifica
        </button>
      </div>
      {menuOrario && (
        <div className="riga" style={{ marginTop: 8 }} role="group" aria-label="Quando la fai?">
          <button type="button" onClick={() => onFaccioAlle('tra30')}>
            Tra 30 minuti
          </button>
          <button type="button" onClick={() => onFaccioAlle('stasera')}>
            Stasera alle {orari.stasera}
          </button>
          <button type="button" onClick={() => onFaccioAlle('domani')}>
            Domani alle {orari.domani}
          </button>
        </div>
      )}
      <p className="muto piccolo messaggio-stato" role="status" style={{ marginTop: 6 }}>
        {esito}
      </p>
    </article>
  );
}

function DomandaAbitudine({ azione }: { azione: Azione }) {
  return (
    <section className="scheda evidenziata" aria-labelledby={`abitudine-${azione.id}`}>
      <h2 id={`abitudine-${azione.id}`}>È diventata abitudine?</h2>
      <p>
        «{azione.faro}»: cinque volte fatta. La fai ormai senza pensarci?
      </p>
      <div className="riga">
        <button type="button" className="primario" onClick={() => void rispondiDomandaAbitudine(azione.id, true)}>
          Sì, è un'abitudine
        </button>
        <button type="button" onClick={() => void rispondiDomandaAbitudine(azione.id, false)}>
          Non ancora del tutto
        </button>
      </div>
      <p className="muto piccolo" style={{ marginTop: 6 }}>
        Sì: libera un posto e la ricontrolliamo ogni 30 giorni. No: continua, con un ritmo di 7 giorni.
      </p>
    </section>
  );
}

function Revisione({ dati, onAttiva }: { dati: Dati; onAttiva: (id: string) => Promise<void> }) {
  const attive = dati.azioni.filter((a) => a.stato === 'attiva');
  const palude = dati.azioni.filter((a) => a.stato === 'palude').slice(0, 5);
  return (
    <section className="scheda" aria-labelledby="titolo-revisione" style={{ borderColor: 'var(--verde-chiaro)' }}>
      <h2 id="titolo-revisione">È domenica: revisione di 5 minuti</h2>
      <p className="muto">Fai pulizia: chiudi quello che è concluso, butta quello che non serve, pesca dalla Palude.</p>
      {attive.length > 0 && (
        <>
          <h3>Attive</h3>
          <ul className="pulita">
            {attive.map((a) => (
              <li key={a.id} className="riga" style={{ justifyContent: 'space-between' }}>
                <span>{a.faro}</span>
                <span className="riga">
                  <button type="button" onClick={() => void chiudiAzione(a.id, 'chiudi')}>
                    Chiudi
                  </button>
                  <button type="button" onClick={() => void chiudiAzione(a.id, 'palude')}>
                    In Palude
                  </button>
                  <button type="button" className="pericolo" onClick={() => void chiudiAzione(a.id, 'butta')}>
                    Butta
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {palude.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>Dalla Palude</h3>
          <ul className="pulita">
            {palude.map((a) => (
              <li key={a.id} className="riga" style={{ justifyContent: 'space-between' }}>
                <span>{a.faro}</span>
                <span className="riga">
                  <button type="button" onClick={() => void onAttiva(a.id)}>
                    Attiva
                  </button>
                  <button type="button" className="pericolo" onClick={() => void chiudiAzione(a.id, 'butta')}>
                    Butta
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="riga" style={{ marginTop: 12 }}>
        <button type="button" className="primario" onClick={() => void segnaRevisioneFatta()}>
          Fatto, a domenica prossima
        </button>
      </div>
    </section>
  );
}

function VistaPalude({
  dati,
  onAttiva,
  onModifica,
}: {
  dati: Dati;
  onAttiva: (id: string) => Promise<void>;
  onModifica: (a: Azione, f: CampoDaModificare) => void;
}) {
  const palude = dati.azioni.filter((a) => a.stato === 'palude').sort((a, b) => b.creata - a.creata);
  return (
    <section className="scheda" aria-labelledby="titolo-palude">
      <h2 id="titolo-palude">La Palude ({palude.length})</h2>
      <p className="muto">Le azioni che aspettano un posto tra le 3 attive.</p>
      {palude.length === 0 && <p>La Palude è vuota.</p>}
      <ul className="pulita">
        {palude.map((a) => (
          <li key={a.id}>
            <p>
              <strong>{a.faro}</strong>
              <br />
              <span className="muto piccolo">
                Quando {a.quando} · 2 minuti: {a.versione2min}
              </span>
            </p>
            <div className="riga">
              <button type="button" className="primario" onClick={() => void onAttiva(a.id)}>
                Attiva
              </button>
              <button type="button" onClick={() => onModifica(a, 'faro')}>
                Modifica
              </button>
              <button type="button" className="pericolo" onClick={() => void chiudiAzione(a.id, 'butta')}>
                Butta
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VistaPancia({ dati }: { dati: Dati }) {
  const pancia = dati.azioni.filter((a) => a.stato === 'fatta').sort((a, b) => b.aggiornata - a.aggiornata);
  const abitudini = dati.azioni.filter((a) => a.stato === 'abitudine');
  return (
    <>
      <section className="scheda" aria-labelledby="titolo-pancia">
        <h2 id="titolo-pancia">La Pancia ({pancia.length})</h2>
        <p className="muto">Le azioni fatte e concluse.</p>
        {pancia.length === 0 && <p>Ancora vuota. La prima Fatta su un'azione singola finisce qui.</p>}
        <ul className="pulita">
          {pancia.map((a) => (
            <li key={a.id}>
              <strong>{a.faro}</strong>{' '}
              <span className="muto piccolo">· {new Date(a.aggiornata).toLocaleDateString('it-IT')}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="scheda" aria-labelledby="titolo-abitudini-tutte">
        <h2 id="titolo-abitudini-tutte">Abitudini ({abitudini.length})</h2>
        {abitudini.length === 0 && <p className="muto">Nessuna ancora.</p>}
        <ul className="pulita">
          {abitudini.map((a) => (
            <li key={a.id}>
              <strong>{a.faro}</strong>{' '}
              <span className="muto piccolo">· ricontrollo {formattaQuando(a.prossimaComparsa, Date.now())}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
