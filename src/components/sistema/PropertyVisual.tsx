import segnaposto from "../../../public/hero/placeholder.json";

/**
 * L'elemento visuale forte della pagina.
 *
 * Con `foto` mostra una delle fotografie in public/hero: due tagli (2048 e
 * 1280) e un segnaposto sfocato di pochi byte che riempie il riquadro mentre
 * il file vero arriva, cosi' la pagina non "salta". Le foto sono 16:9 e il
 * riquadro dell'hero e' 4:5: `fuoco` dice dove sta il soggetto, cosi' il
 * ritaglio lo tiene invece di centrare a caso.
 *
 * Senza `foto` resta il disegno architettonico di prima, che non pesa nulla e
 * serve da riserva: elementi in percentuale, non SVG a viewBox fisso, perche'
 * il riquadro cambia proporzione fra hero, confronto e mobile.
 */
export type Foto = keyof typeof segnaposto;

export default function PropertyVisual({
  foto, fuoco = "50% 50%", alt = "", wide = false, didascalia, nota, prioritaria = false,
}: {
  foto?: Foto; fuoco?: string; alt?: string; wide?: boolean;
  didascalia?: string; nota?: string;
  /** l'immagine dell'hero si carica prima di tutto il resto */
  prioritaria?: boolean;
}) {
  return (
    <figure className={`v-visual${wide ? " v-visual--wide" : ""}${foto ? " v-visual--foto" : ""}`} style={{ margin: 0 }}>
      {foto ? (
        <img
          src={`/hero/${foto}.webp`}
          srcSet={`/hero/${foto}-1280.webp 1280w, /hero/${foto}.webp 2048w`}
          sizes="(max-width: 900px) 100vw, 46vw"
          alt={alt}
          width={2048} height={1152}
          loading={prioritaria ? "eager" : "lazy"}
          fetchPriority={prioritaria ? "high" : "auto"}
          decoding="async"
          style={{ objectPosition: fuoco, backgroundImage: `url(${segnaposto[foto]})`, backgroundSize: "cover" }}
        />
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
