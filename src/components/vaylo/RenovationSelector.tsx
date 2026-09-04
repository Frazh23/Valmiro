"use client";
import NumeroAnimato from "./NumeroAnimato";
import BeforeAfter from "./BeforeAfter";
import { eur } from "@/lib/formato";
import { RISTRUTTURAZIONE } from "@/lib/engine";

export type Prospetto = {
  livello: string; euroMq: number; costo: number; detrazione: number; rate: number;
  costoNetto: number; valorePrima: number; valoreDopo: number; margine: number;
};

/**
 * Scenari di ristrutturazione.
 * Ogni cifra qui viene da prospettoRistrutturazione(), calcolata dal motore e
 * ricevuta gia' pronta: questo componente sceglie quale mostrare e anima il
 * passaggio, non calcola nulla.
 */
export default function RenovationSelector({
  attuale, prospetti, scelto, onSceglie, primaCasa, onPrimaCasa,
}: {
  attuale: number;
  prospetti: Record<string, Prospetto>;
  scelto: string;               // "attuale" | id di RISTRUTTURAZIONE
  onSceglie: (id: string) => void;
  primaCasa: boolean;
  onPrimaCasa: (v: boolean) => void;
}) {
  const p = scelto === "attuale" ? null : prospetti[scelto];
  const valore = p ? p.valoreDopo : attuale;
  const delta = valore - attuale;
  const liv = RISTRUTTURAZIONE.find((r) => r.id === scelto);

  return (
    <div className="v-reno">
      <div>
        <div className="v-scenari" role="group" aria-label="Scenario di ristrutturazione">
          <button className="v-scenario" aria-pressed={scelto === "attuale"} onClick={() => onSceglie("attuale")}>
            Oggi
          </button>
          {RISTRUTTURAZIONE.map((r) => (
            <button key={r.id} className="v-scenario" aria-pressed={scelto === r.id}
                    disabled={!prospetti[r.id]} onClick={() => onSceglie(r.id)}>
              {r.nome}
            </button>
          ))}
        </div>

        <p className="v-eyebrow">{p ? "Valore dopo i lavori" : "Valore attuale"}</p>
        <p className="v-reno__value" aria-live="polite">
          <NumeroAnimato valore={valore} /> €
        </p>
        {p && (
          <p className={"v-reno__delta " + (delta >= 0 ? "pos" : "neg")}>
            {delta >= 0 ? "+" : "−"}{eur(Math.abs(delta))} € rispetto a oggi
          </p>
        )}

        {p ? (
          <>
            <div className="v-reno__lines">
              <div className="v-factor">
                <span className="v-factor__n">Lavori · {eur(p.euroMq)} €/mq</span>
                <span className="v-factor__v neg">−{eur(p.costo)} €</span>
              </div>
              <div className="v-factor">
                <span className="v-factor__n">Detrazione fiscale in {p.rate} anni</span>
                <span className="v-factor__v pos">+{eur(p.detrazione)} €</span>
              </div>
              <div className="v-factor v-factor--total">
                <span className="v-factor__n">Margine</span>
                <span className={"v-factor__v " + (p.margine >= 0 ? "pos" : "neg")}>
                  {p.margine >= 0 ? "+" : "−"}{eur(Math.abs(p.margine))} €
                </span>
              </div>
            </div>
            {liv && <p className="v-reno__what">{liv.cosa}</p>}
            <label className="v-toggle" style={{ marginTop: "var(--s-6)" }}>
              <span>
                È la tua prima casa
                <small>Prima casa 50%, altri immobili 36%. Tetto {eur(96000)} €.</small>
              </span>
              <input type="checkbox" checked={primaCasa} onChange={(e) => onPrimaCasa(e.target.checked)} />
            </label>
          </>
        ) : (
          <p className="v-reno__what">
            Scegli un livello di intervento per vedere quanto costerebbe, quanto ne torna
            indietro con le detrazioni e quanto varrebbe la casa dopo.
          </p>
        )}
      </div>

      <div>
        <BeforeAfter etichettaDopo={liv ? liv.nome : "Dopo i lavori"} />
        <p className="v-micro" style={{ marginTop: "var(--s-4)" }}>
          Rappresentazione indicativa. Le immagini reali dell&apos;immobile si collegano qui.
        </p>
      </div>
    </div>
  );
}
