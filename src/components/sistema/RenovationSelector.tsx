"use client";
import NumeroAnimato from "./NumeroAnimato";
import BeforeAfter from "./BeforeAfter";
import { eur } from "@/lib/formato";
import { RISTRUTTURAZIONE } from "@/lib/engine";

export type Prospetto = {
  livello: string; euroMq: number; costo: number; detrazione: number; rate: number;
  costoNetto: number; valorePrima: number; valoreDopo: number;
  valoreDopoMin: number; valoreDopoMax: number; sigmaDopo: number;
  margine: number;
};

/**
 * Scenari di ristrutturazione.
 * Ogni cifra viene da prospettoRistrutturazione(), calcolata dal motore e
 * ricevuta gia' pronta: qui si sceglie quale mostrare e si anima il passaggio.
 *
 * Due scelte deliberate sull'onesta' dei numeri:
 * - il valore dopo i lavori si mostra come intervallo, come la stima principale:
 *   deriva da quella e non puo' essere piu' preciso di lei;
 * - il margine non e' il protagonista. E' il numero meno affidabile della
 *   pagina, perche' somma l'incertezza della stima a quella di un costo che e'
 *   una media di fascia e non un preventivo.
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

  /* L'OMI pubblica due stati, non tre: oltre "come nuova" la zona non riconosce
     di piu'. Due livelli di spesa possono quindi arrivare allo stesso valore.
     Non lo nascondiamo dietro un premio inventato: lo diciamo. */
  const stessoValore = RISTRUTTURAZIONE.filter(
    (r) => prospetti[r.id] && p && prospetti[r.id].valoreDopo === p.valoreDopo
  );
  const piuEconomico = stessoValore[0];
  const plateau = p && piuEconomico && piuEconomico.id !== scelto ? piuEconomico : null;

  return (
    <div className="v-reno">
      <div>
        <div className="v-scenari" role="group" aria-label="Livello di intervento">
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
          <>
            <p className="v-reno__range">Intervallo {eur(p.valoreDopoMin)} – {eur(p.valoreDopoMax)} €</p>
            <p className={"v-reno__delta " + (delta >= 0 ? "pos" : "neg")}>
              {delta >= 0 ? "+" : "−"}{eur(Math.abs(delta))} € rispetto a oggi
            </p>
          </>
        )}

        {plateau && (
          <p className="v-plateau">
            Stesso valore di <b>{plateau.nome}</b>. Le quotazioni ufficiali si fermano allo
            stato «come nuova»: oltre quella soglia la zona non riconosce di più, e la
            differenza fra i due livelli è tutta nel costo. Infatti il margine scende.
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
              <div className="v-factor">
                <span className="v-factor__n">Margine indicativo</span>
                <span className={"v-factor__v " + (p.margine >= 0 ? "pos" : "neg")}>
                  {p.margine >= 0 ? "+" : "−"}{eur(Math.abs(p.margine))} €
                </span>
              </div>
            </div>

            <p className="v-caveat">
              Il costo dei lavori è una media della fascia di zona, non un preventivo: un
              preventivo vero cambia sensibilmente con il palazzo, il piano e gli accessi.
              Il margine somma l&apos;incertezza della stima a quella del costo, ed è per
              questo il numero meno solido di tutta la pagina: leggilo come ordine di
              grandezza, non come una previsione di guadagno.
            </p>

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
