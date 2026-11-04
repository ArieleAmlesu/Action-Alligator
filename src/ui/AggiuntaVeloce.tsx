import { useId, useState, type FormEvent } from 'react';
import type { Fonte, TipoAzione, TipoFonte } from '../core/types';
import { aggiungiAzione } from '../lib/operazioni';

const TIPI_FONTE: { valore: TipoFonte; nome: string }[] = [
  { valore: 'libro', nome: 'Libro' },
  { valore: 'video', nome: 'Video' },
  { valore: 'corso', nome: 'Corso' },
  { valore: 'esperienza', nome: 'Esperienza' },
  { valore: 'altro', nome: 'Altro' },
];

/** Aggiunta veloce: fonte, quando, farò, versione da 2 minuti, tipo. */
export function AggiuntaVeloce({ fonti, compatta = false }: { fonti: Fonte[]; compatta?: boolean }) {
  const id = useId();
  const [fonteTitolo, setFonteTitolo] = useState('');
  const [fonteTipo, setFonteTipo] = useState<TipoFonte>('libro');
  const [quando, setQuando] = useState('');
  const [faro, setFaro] = useState('');
  const [versione2min, setVersione2min] = useState('');
  const [tipo, setTipo] = useState<TipoAzione>('ricorrente');
  const [esito, setEsito] = useState('');
  const [inCorso, setInCorso] = useState(false);

  const fonteEsistente = fonti.some((f) => f.titolo.toLowerCase() === fonteTitolo.trim().toLowerCase());

  async function invia(e: FormEvent) {
    e.preventDefault();
    if (!quando.trim() || !faro.trim() || !versione2min.trim()) return;
    setInCorso(true);
    try {
      const a = await aggiungiAzione({ fonteTitolo, fonteTipo, quando, faro, versione2min, tipo });
      setEsito(
        a.stato === 'attiva'
          ? 'Aggiunta tra le azioni attive.'
          : 'Hai già 3 azioni attive: questa aspetta nella Palude.',
      );
      setQuando('');
      setFaro('');
      setVersione2min('');
    } catch {
      setEsito('Non sono riuscito a salvarla. Riprova.');
    } finally {
      setInCorso(false);
    }
  }

  return (
    <form onSubmit={invia} aria-label="Aggiunta veloce">
      <div className={compatta ? '' : 'griglia-2'}>
        <div className="campo">
          <label htmlFor={`${id}-fonte`}>
            Fonte <span className="aiuto">(facoltativa: libro, video, corso…)</span>
          </label>
          <input
            id={`${id}-fonte`}
            list={`${id}-fonti`}
            value={fonteTitolo}
            onChange={(e) => setFonteTitolo(e.target.value)}
            placeholder="es. Atomic Habits"
            autoComplete="off"
          />
          <datalist id={`${id}-fonti`}>
            {fonti.map((f) => (
              <option key={f.id} value={f.titolo} />
            ))}
          </datalist>
        </div>
        {fonteTitolo.trim() && !fonteEsistente && (
          <div className="campo">
            <label htmlFor={`${id}-fonte-tipo`}>Tipo di fonte</label>
            <select id={`${id}-fonte-tipo`} value={fonteTipo} onChange={(e) => setFonteTipo(e.target.value as TipoFonte)}>
              {TIPI_FONTE.map((t) => (
                <option key={t.valore} value={t.valore}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="campo">
        <label htmlFor={`${id}-quando`}>Quando… <span className="aiuto">(il momento preciso)</span></label>
        <input
          id={`${id}-quando`}
          value={quando}
          onChange={(e) => setQuando(e.target.value)}
          placeholder="es. apro il portatile la mattina"
          required
        />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-faro`}>…farò <span className="aiuto">(un'azione specifica)</span></label>
        <input
          id={`${id}-faro`}
          value={faro}
          onChange={(e) => setFaro(e.target.value)}
          placeholder="es. scrivo le 3 priorità del giorno"
          required
        />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-v2`}>Versione da 2 minuti</label>
        <input
          id={`${id}-v2`}
          value={versione2min}
          onChange={(e) => setVersione2min(e.target.value)}
          placeholder="es. scrivo solo la prima priorità"
          required
        />
      </div>
      <fieldset className="campo" style={{ border: 'none', padding: 0, margin: '0 0 10px' }}>
        <legend className="sr-only">Tipo di azione</legend>
        <div className="riga">
          <label className="riga" style={{ fontWeight: 400 }}>
            <input type="radio" name={`${id}-tipo`} checked={tipo === 'ricorrente'} onChange={() => setTipo('ricorrente')} />
            Ricorrente
          </label>
          <label className="riga" style={{ fontWeight: 400 }}>
            <input type="radio" name={`${id}-tipo`} checked={tipo === 'singola'} onChange={() => setTipo('singola')} />
            Una volta sola
          </label>
        </div>
      </fieldset>
      <div className="riga">
        <button type="submit" className="primario" disabled={inCorso}>
          Aggiungi
        </button>
        <span className="muto piccolo messaggio-stato" role="status">
          {esito}
        </span>
      </div>
    </form>
  );
}
