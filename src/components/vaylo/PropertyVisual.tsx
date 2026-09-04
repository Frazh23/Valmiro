/**
 * L'elemento visuale forte della pagina.
 *
 * Oggi e' una composizione architettonica disegnata: luce naturale che entra da
 * una vetrata milanese. Niente foto stock, niente rete, nessun peso di caricamento.
 * Quando ci saranno le immagini definitive basta passare `src`: il componente
 * mostra quelle e il disegno resta come fallback. Il layer immagini e' volutamente
 * l'unica cosa da sostituire.
 *
 * Il disegno usa currentColor con opacita' diverse invece di variabili CSS dentro
 * i gradienti SVG: le variabili nei gradienti hanno storia di bug su Safari, e qui
 * un fallback nero rovinerebbe la pagina.
 */
export default function PropertyVisual({
  src, alt = "", wide = false, didascalia, nota,
}: { src?: string; alt?: string; wide?: boolean; didascalia?: string; nota?: string }) {
  return (
    <figure className={`v-visual${wide ? " v-visual--wide" : ""}`} style={{ margin: 0 }}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="v-visual__draw">
          <svg viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            {/* pavimento */}
            <rect y="720" width="800" height="280" fill="currentColor" opacity=".05" />
            {/* fascio di luce che entra dalla vetrata e si appoggia a terra */}
            <path d="M150 120 L560 120 L760 1000 L300 1000 Z" fill="currentColor" opacity=".028" />
            {/* accenno di citta' oltre il vetro */}
            <g fill="currentColor" opacity=".10">
              <rect x="166" y="196" width="46" height="104" />
              <rect x="228" y="228" width="38" height="72" />
              <rect x="300" y="176" width="52" height="124" />
              <rect x="372" y="236" width="34" height="64" />
              <rect x="440" y="204" width="58" height="96" />
              <rect x="512" y="248" width="34" height="52" />
            </g>
            {/* vetrata: telaio sottile, tre campate, traverso alto */}
            <g stroke="currentColor" strokeWidth="3" fill="none" opacity=".26">
              <rect x="150" y="120" width="410" height="600" rx="6" />
              <line x1="286" y1="120" x2="286" y2="720" />
              <line x1="423" y1="120" x2="423" y2="720" />
              <line x1="150" y1="300" x2="560" y2="300" />
            </g>
            {/* linea d'orizzonte interna */}
            <line x1="0" y1="720" x2="800" y2="720" stroke="currentColor" strokeWidth="2" opacity=".22" />
          </svg>
        </div>
      )}
      {(didascalia || nota) && (
        <figcaption className="v-visual__caption">
          <span>{didascalia}</span><span>{nota}</span>
        </figcaption>
      )}
    </figure>
  );
}
