"use client";
import { useEffect, useRef, useState } from "react";
import { eur } from "@/lib/formato";

/**
 * Conta fino al valore. Serve a far percepire il numero come un risultato,
 * non come un dato gia' li'. Ogni cambio successivo (scenari di ristrutturazione)
 * riparte dal valore precedente invece che da zero: e' la transizione a
 * raccontare il delta.
 *
 * Robustezza, imparata provando in produzione: requestAnimationFrame non gira
 * quando la pagina non e' visibile. Senza rete di sicurezza, chi cambia scheda
 * mentre il valore cambia torna e trova il numero vecchio — e l'animazione era
 * l'unica cosa che lo aggiornava. Quindi: se la pagina e' nascosta si salta
 * l'animazione, e in ogni caso un timer garantisce l'arrivo al valore finale.
 */
export default function NumeroAnimato({
  valore, durata = 900, className,
}: { valore: number; durata?: number; className?: string }) {
  const [mostrato, setMostrato] = useState(valore);
  const da = useRef(valore);
  const raf = useRef<number | null>(null);
  const rete = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const partenza = da.current;
    const salta =
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      document.hidden ||
      partenza === valore;

    if (salta) { setMostrato(valore); da.current = valore; return; }

    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durata);
      const e = 1 - Math.pow(1 - p, 3);          // easing out cubic
      setMostrato(partenza + (valore - partenza) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else da.current = valore;
    };
    raf.current = requestAnimationFrame(tick);

    /* Se l'animazione non arriva in fondo — scheda nascosta, frame saltati —
       il valore finale viene comunque messo. Il numero giusto conta piu'
       dell'effetto. */
    rete.current = setTimeout(() => {
      setMostrato(valore); da.current = valore;
      if (raf.current) cancelAnimationFrame(raf.current);
    }, durata + 250);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      if (rete.current) clearTimeout(rete.current);
      da.current = valore;
    };
  }, [valore, durata]);

  return <span className={className}>{eur(mostrato)}</span>;
}
