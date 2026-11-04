import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Azione, TipoAzione } from '../core/types';
import { chiudiAzione, modificaAzione } from '../lib/operazioni';

/** <dialog> nativo: gestisce da solo focus, Esc e tastiera. */
export function Dialogo({ aperto, onChiudi, titolo, children }: { aperto: boolean; onChiudi: () => void; titolo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aperto && !d.open) d.showModal();
    if (!aperto && d.open) d.close();
  }, [aperto]);
  return (
    <dialog ref={ref} onClose={onChiudi} aria-labelledby={id}>
      <h2 id={id}>{titolo}</h2>
      {aperto && children}
    </dialog>
  );
}

export type CampoDaModificare = 'faro' | 'versione2min' | 'quando';

export function ModificaAzione({ azione, focus, onChiudi }: { azione: Azione | null; focus?: CampoDaModificare; onChiudi: () => void }) {
  return (
    <Dialogo aperto={azione !== null} onChiudi={onChiudi} titolo={focus === 'versione2min' ? 'Rimpiccioliscila' : focus === 'quando' ? 'Cambia momento' : 'Modifica azione'}>
      {azione && <FormModifica azione={azione} focus={focus ?? 'faro'} onChiudi={onChiudi} />}
    </Dialogo>
  );
}

function FormModifica({ azione, focus, onChiudi }: { azione: Azione; focus: CampoDaModificare; onChiudi: () => void }) {
  const id = useId();
  const [quando, setQuando] = useState(azione.quando);
  const [faro, setFaro] = useState(azione.faro);
  const [versione2min, setVersione2min] = useState(azione.versione2min);
  const [tipo, setTipo] = useState<TipoAzione>(azione.tipo);

  async function salva(e: FormEvent) {
    e.preventDefault();
    await modificaAzione(azione.id, { quando, faro, versione2min, tipo });
    onChiudi();
  }

  return (
    <form onSubmit={salva}>
      {focus === 'versione2min' && (
        <p className="muto">Rendila così piccola che dire di no sembri strano. Cosa puoi fare in 2 minuti?</p>
      )}
      {focus === 'quando' && <p className="muto">Forse il momento non era quello giusto. Quando ti viene naturale farla?</p>}
      <div className="campo">
        <label htmlFor={`${id}-q`}>Quando…</label>
        <input id={`${id}-q`} value={quando} onChange={(e) => setQuando(e.target.value)} required autoFocus={focus === 'quando'} />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-f`}>…farò</label>
        <input id={`${id}-f`} value={faro} onChange={(e) => setFaro(e.target.value)} required autoFocus={focus === 'faro'} />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-v`}>Versione da 2 minuti</label>
        <input
          id={`${id}-v`}
          value={versione2min}
          onChange={(e) => setVersione2min(e.target.value)}
          required
          autoFocus={focus === 'versione2min'}
        />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-t`}>Tipo</label>
        <select id={`${id}-t`} value={tipo} onChange={(e) => setTipo(e.target.value as TipoAzione)}>
          <option value="ricorrente">Ricorrente</option>
          <option value="singola">Una volta sola</option>
        </select>
      </div>
      <div className="riga">
        <button type="submit" className="primario">
          Salva
        </button>
        <button type="button" onClick={onChiudi}>
          Annulla
        </button>
      </div>
    </form>
  );
}

/** Regola 1: hai già 3 attive, quale chiudi? */
export function ScegliQualeChiudere({
  attive,
  aperto,
  onChiudi,
  onLiberato,
}: {
  attive: Azione[];
  aperto: boolean;
  onChiudi: () => void;
  onLiberato: () => void;
}) {
  async function libera(id: string, come: 'palude' | 'butta' | 'chiudi') {
    await chiudiAzione(id, come);
    onLiberato();
  }
  return (
    <Dialogo aperto={aperto} onChiudi={onChiudi} titolo="Hai già 3 azioni attive">
      <p>Per attivarne un'altra, chiudine una. Quale?</p>
      <ul className="pulita">
        {attive.map((a) => (
          <li key={a.id}>
            <p>
              <strong>{a.faro}</strong>
              <br />
              <span className="muto piccolo">Quando {a.quando}</span>
            </p>
            <div className="riga">
              <button type="button" onClick={() => libera(a.id, 'palude')}>
                Rimetti in Palude
              </button>
              <button type="button" onClick={() => libera(a.id, 'chiudi')}>
                Chiudi (conclusa)
              </button>
              <button type="button" className="pericolo" onClick={() => libera(a.id, 'butta')}>
                Butta
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="riga" style={{ marginTop: 12 }}>
        <button type="button" onClick={onChiudi}>
          Lascia stare
        </button>
      </div>
    </Dialogo>
  );
}
