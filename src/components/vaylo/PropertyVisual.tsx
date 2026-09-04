/**
 * L'elemento visuale forte della pagina.
 *
 * Oggi e' una composizione architettonica disegnata: una vetrata, la luce che
 * entra e si appoggia al pavimento, lo spigolo di una parete. Niente foto stock,
 * niente rete, nessun peso di caricamento.
 *
 * E' costruita con elementi posizionati in percentuale, non con un SVG a viewBox
 * fisso: il riquadro cambia proporzione fra hero (4:5), confronto (4:3) e mobile
 * (3:2), e un SVG ritagliato perdeva ogni volta pezzi diversi del disegno.
 *
 * Quando ci saranno le immagini definitive basta passare `src`: il disegno resta
 * come fallback e non cambia nient'altro.
 */
export default function PropertyVisual({
  src, alt = "", wide = false, didascalia, nota,
}: { src?: string; alt?: string; wide?: boolean; didascalia?: string; nota?: string }) {
  return (
    <figure className={`v-visual${wide ? " v-visual--wide" : ""}`} style={{ margin: 0 }}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="v-draw" aria-hidden="true">
          <span className="v-draw__wall" />
          <span className="v-draw__floor" />
          <span className="v-draw__light" />
          <span className="v-draw__win">
            <span className="v-draw__transom" />
            <span className="v-draw__mullion" />
            <span className="v-draw__horizon" />
          </span>
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
