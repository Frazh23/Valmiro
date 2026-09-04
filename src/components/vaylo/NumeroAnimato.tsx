"use client";
import { useEffect, useRef, useState } from "react";
import { eur } from "@/lib/formato";

/**
 * Conta fino al valore. Serve a far percepire il numero come un risultato,
 * non come un dato gia' li'. Con prefers-reduced-motion mostra subito il valore
 * finale, e ogni cambio successivo (scenari di ristrutturazione) riparte dal
 * valore precedente invece che da zero: e' la transizione a raccontare il delta.
 */
export default function NumeroAnimato({
  valore, durata = 900, className,
}: { valore: number; durata?: number; className?: string }) {
  const [mostrato, setMostrato] = useState(valore);
  const da = useRef(valore);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const ridotto =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const partenza = da.current;
    if (ridotto || partenza === valore) { setMostrato(valore); da.current = valore; return; }

    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durata);
      const e = 1 - Math.pow(1 - p, 3);          // easing out cubic
      setMostrato(partenza + (valore - partenza) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else da.current = valore;
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); da.current = valore; };
  }, [valore, durata]);

  return <span className={className}>{eur(mostrato)}</span>;
}
