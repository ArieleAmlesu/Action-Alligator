import type { Umore } from '../core/hunger';

/** L'alligatore, con l'espressione che cambia secondo l'umore. */
export function Alligatore({ umore, dimensione = 120 }: { umore: Umore; dimensione?: number }) {
  // Quanto è aperta la bocca e com'è l'occhio
  const apertura = { sazio: 0, vigile: 4, affamato: 10, feroce: 16 }[umore];
  const palpebra = { sazio: 6, vigile: 0, affamato: 0, feroce: 3 }[umore];
  return (
    <svg width={dimensione} height={dimensione} viewBox="0 0 128 128" aria-hidden="true">
      <g transform={`rotate(${apertura / 2} 16 78)`}>
        <path d="M16 80 L104 76 C114 76 114 90 102 92 L34 100 C22 101 16 93 16 80 Z" fill="#8bc34a" />
      </g>
      {apertura > 0 && (
        <path d="M56 74 L62 74 L59 82 Z M70 73 L76 73 L73 81 Z M84 72 L90 72 L87 80 Z M98 71 L103 71 L100.5 78 Z" fill="#ffffff" />
      )}
      <g transform={`rotate(${-apertura / 2} 16 76)`}>
        <path d="M16 76 C14 54 26 40 40 40 C46 26 66 26 70 42 L106 52 C118 56 118 70 106 71 L16 76 Z" fill="#4caf50" />
        <path d="M74 44 L80 36 L84 46 Z M88 48 L94 40 L98 50 Z" fill="#4caf50" />
        <circle cx="52" cy="40" r="10" fill="#ffffff" />
        <circle cx="55" cy={umore === 'feroce' ? 41 : 40} r={umore === 'feroce' ? 4 : 5} fill="#13261a" />
        {palpebra > 0 && <rect x="41" y="29" width="22" height={palpebra + 4} rx="4" fill="#4caf50" />}
        {umore === 'feroce' && <path d="M42 28 L62 33" stroke="#1e5e3a" strokeWidth="3" strokeLinecap="round" />}
        <ellipse cx="106" cy="58" rx="3.5" ry="2.5" fill="#1e5e3a" />
      </g>
    </svg>
  );
}
