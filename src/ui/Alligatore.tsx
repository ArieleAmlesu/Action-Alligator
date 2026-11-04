import type { Umore } from '../core/hunger';

/** L'alligatore, con l'espressione che cambia secondo l'umore. */
export function Alligatore({ umore, dimensione = 120 }: { umore: Umore; dimensione?: number }) {
  // Gradi di apertura della bocca e quanto è chiusa la palpebra
  const apertura = { sazio: 0, vigile: 8, affamato: 18, feroce: 28 }[umore];
  const palpebra = { sazio: 7, vigile: 0, affamato: 0, feroce: 3 }[umore];
  // Interno della bocca: un cuneo tra le due mascelle, dal cardine verso il muso.
  const punto = (gradi: number, l: number) => {
    const r = (gradi * Math.PI) / 180;
    return `${(20 + l * Math.cos(r)).toFixed(1)} ${(77 + l * Math.sin(r)).toFixed(1)}`;
  };
  const bocca = `M20 77 L${punto(-3.2 - apertura * 0.6, 84)} L${punto(-2.6 + apertura * 0.4, 82)} Z`;
  return (
    <svg width={dimensione} height={dimensione} viewBox="0 0 128 128" aria-hidden="true">
      {apertura > 0 && <path d={bocca} fill="#5a1f24" />}
      <g transform={`rotate(${apertura * 0.4} 20 78)`}>
        <path d="M16 80 L104 76 C114 76 114 90 102 92 L34 100 C22 101 16 93 16 80 Z" fill="#8bc34a" />
        {apertura > 0 && <path d="M60 79 L66 79 L63 73 Z M76 78 L82 78 L79 72 Z M92 77 L98 77 L95 71 Z" fill="#ffffff" />}
      </g>
      <g transform={`rotate(${-apertura * 0.6} 20 76)`}>
        {apertura > 0 && (
          <path d="M56 74 L62 74 L59 82 Z M70 73 L76 73 L73 81 Z M84 72 L90 72 L87 80 Z M98 71 L103 71 L100.5 78 Z" fill="#ffffff" />
        )}
        <path d="M16 76 C14 54 26 40 40 40 C46 26 66 26 70 42 L106 52 C118 56 118 70 106 71 L16 76 Z" fill="#4caf50" />
        <path d="M74 44 L80 36 L84 46 Z M88 48 L94 40 L98 50 Z" fill="#4caf50" />
        <circle cx="52" cy="40" r="10" fill="#ffffff" />
        <circle cx="55" cy={umore === 'feroce' ? 41 : 40} r={umore === 'feroce' ? 4 : 5} fill="#13261a" />
        {palpebra > 0 && <path d={`M42 ${30 + palpebra} A10 10 0 0 1 62 ${30 + palpebra} Z`} fill="#4caf50" />}
        {palpebra > 0 && umore === 'sazio' && <rect x="41" y="29" width="22" height={palpebra + 1} fill="#4caf50" />}
        {umore === 'feroce' && <path d="M41 29 L63 35" stroke="#1e5e3a" strokeWidth="3.5" strokeLinecap="round" />}
        <ellipse cx="106" cy="58" rx="3.5" ry="2.5" fill="#1e5e3a" />
      </g>
    </svg>
  );
}
