import { eur } from "@/lib/formato";
import type { Stima } from "@/lib/types";

/**
 * "Perche' vale questa cifra": le stesse voci che il motore ha gia' prodotto in
 * `stima.dettaglio`. Qui non si ricalcola niente, si mette in colonna.
 * La prima voce e' la base; le pertinenze arrivano subito dopo con il loro
 * contributo in euro; i coefficienti a effetto nullo restano fuori, perche' non
 * spiegano nulla; una voce a zero euro con effetto zero e' una nota (per esempio
 * «pertinenze gia' comprese») e si mostra come tale.
 */
export default function FactorExplanation({ stima }: { stima: Stima }) {
  const [base, ...resto] = stima.dettaglio;
  const voci = resto.filter((v) => Math.round(v.euro) !== 0 || v.nota);

  return (
    <div className="v-factors">
      <div className="v-factor">
        <span className="v-factor__n">{base.voce}</span>
        <span className="v-factor__v">{eur(base.euro)} €</span>
      </div>
      {voci.map((v, n) => (
        <div className="v-factor" key={n}>
          <span className="v-factor__n">{v.voce}</span>
          {Math.round(v.euro) === 0 ? (
            <span className="v-factor__v" style={{ color: "var(--ink-faint)", fontWeight: 400 }}>—</span>
          ) : (
            <span className={"v-factor__v " + (v.euro > 0 ? "pos" : "neg")}>
              {v.euro > 0 ? "+" : "−"}{eur(Math.abs(v.euro))} €
            </span>
          )}
        </div>
      ))}
      <div className="v-factor v-factor--total">
        <span className="v-factor__n">Valore centrale</span>
        <span className="v-factor__v">{eur(stima.centro)} €</span>
      </div>
    </div>
  );
}
