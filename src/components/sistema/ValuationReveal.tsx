"use client";
import { useEffect, useRef, useState } from "react";

const FASI = [
  "Individuiamo la zona",
  "Leggiamo le quotazioni ufficiali",
  "Pesiamo le caratteristiche",
  "Stimiamo il potenziale",
];

/* La coreografia non aggiunge attesa: il calcolo parte subito e le fasi
   si limitano a occupare il tempo che il lavoro impiega davvero. Se il lavoro
   finisce prima, le fasi rimaste scorrono al passo rapido; il minimo esiste solo
   perche' un lampo di 80 ms si leggerebbe come uno sfarfallio, non come un
   risultato. Chi ha chiesto meno movimento salta tutto. */
const PASSO_MIN = 280;    // ms per fase mentre il lavoro e' ancora in corso
const PASSO_RAPIDO = 150; // ms per fase quando il risultato e' gia' arrivato
const TETTO = 2400;       // ms: oltre questo si mostra comunque il risultato

const attesa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ValuationReveal<T>({
  indirizzo, lavoro, onFatto, onErrore,
}: {
  indirizzo: string;
  lavoro: () => Promise<T>;
  onFatto: (r: T) => void;
  onErrore: (m: string) => void;
}) {
  const [fase, setFase] = useState(0);

  /* Le callback arrivano come funzioni nuove a ogni render del genitore. Se
     finissero nelle dipendenze dell'effetto, ogni render lo smonterebbe e la
     sequenza morirebbe al primo passo: la schermata resterebbe ferma per sempre.
     Le teniamo in un ref e l'effetto parte una volta sola. */
  const rif = useRef({ lavoro, onFatto, onErrore });
  rif.current = { lavoro, onFatto, onErrore };

  useEffect(() => {
    let vivo = true;

    (async () => {
      const t0 = performance.now();
      let esito: T | undefined;
      let riuscito = false;
      let finito = false;

      const p = rif.current.lavoro().then(
        (r) => { esito = r; riuscito = true; finito = true; },
        (e) => { finito = true; if (vivo) rif.current.onErrore(e?.message || "Calcolo non riuscito."); }
      );

      const ridotto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!ridotto) {
        for (let n = 1; n < FASI.length; n++) {
          if (!vivo) return;
          await attesa(finito ? PASSO_RAPIDO : PASSO_MIN);
          if (!vivo) return;
          setFase(n);
          if (performance.now() - t0 > TETTO) break;
        }
      }

      await p;
      if (vivo && riuscito) rif.current.onFatto(esito as T);
    })();

    return () => { vivo = false; };
  }, []);

  const avanzamento = ((fase + 1) / FASI.length) * 100;

  return (
    <div className="v-reveal-screen" role="status" aria-live="polite">
      <div className="v-reveal-screen__in">
        <p className="v-eyebrow">Valutazione in corso</p>
        <h1 className="v-h2" style={{ marginTop: "var(--s-3)" }}>{indirizzo}</h1>

        <ol className="v-phases" style={{ listStyle: "none", padding: 0 }}>
          {FASI.map((f, n) => (
            <li key={f} className="v-phase" data-state={n === fase ? "now" : n < fase ? "done" : "next"}>
              <span className="v-phase__dot" />
              {f}
            </li>
          ))}
        </ol>

        <div className="v-progress"><i style={{ width: `${avanzamento}%` }} /></div>
      </div>
    </div>
  );
}
