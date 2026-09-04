"use client";
import { useEffect, useRef, useState } from "react";
import { cercaZona } from "@/lib/data";

export type Scelta = { zona: string; etichetta: string; descrizione: string; preciso: boolean };

/**
 * Ricerca dell'indirizzo.
 * Mentre scrivi i suggerimenti arrivano dal dizionario locale: istantanei e senza rete.
 * Il geocoder vero parte solo quando confermi, perche' Nominatim ammette una
 * richiesta al secondo e chiamarlo a ogni tasto ci farebbe bloccare.
 */
export default function Ricerca({ valore, onScegli }: { valore: string | null; onScegli: (s: Scelta) => void }) {
  const [q, setQ] = useState(valore || "");
  const [locali, setLocali] = useState<{ nome: string; zona: string; descrizione: string }[]>([]);
  const [remoti, setRemoti] = useState<any[] | null>(null);
  const [stato, setStato] = useState<"fermo" | "cerco" | "errore">("fermo");
  const [nota, setNota] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(valore || ""); }, [valore]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) { setLocali([]); setRemoti(null); }
    };
    addEventListener("mousedown", onClick);
    return () => removeEventListener("mousedown", onClick);
  }, []);

  function digita(v: string) {
    setQ(v); setRemoti(null); setNota(null);
    setLocali(v.trim().length >= 2 ? cercaZona(v, 6) : []);
  }

  async function conferma() {
    if (q.trim().length < 3) return;
    setStato("cerco"); setLocali([]); setNota(null);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((x) => x.json());
      setRemoti(r.candidati || []);
      if (!r.candidati?.length) setNota(r.motivo || "Nessun risultato.");
      else if (r.metodo === "dizionario") setNota(r.motivo);
      setStato("fermo");
    } catch {
      setStato("errore"); setNota("Ricerca non riuscita. Indica il punto sulla mappa.");
    }
  }

  const scegli = (s: Scelta) => { setQ(s.etichetta); setLocali([]); setRemoti(null); onScegli(s); };

  return (
    <div className="field" ref={box} style={{ position: "relative" }}>
      <span className="lbl">Indirizzo o quartiere</span>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={q}
          onChange={(e) => digita(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && conferma()}
          placeholder="Via Solari 21"
          autoComplete="off"
        />
        <button className="primary" onClick={conferma} disabled={stato === "cerco"}>
          {stato === "cerco" ? "…" : "Cerca"}
        </button>
      </div>

      {locali.length > 0 && (
        <div className="aclist">
          <div className="aclist-head">Quartieri e vie che conosco</div>
          {locali.map((c) => (
            <button key={c.nome + c.zona}
              onClick={() => scegli({ zona: c.zona, etichetta: c.nome, descrizione: c.descrizione, preciso: false })}>
              <span>{c.nome}<small>zona {c.zona} · {c.descrizione}</small></span>
              <span className="zpill">{c.zona}</span>
            </button>
          ))}
          <div className="aclist-foot">Premi Cerca per l&apos;indirizzo esatto con il civico</div>
        </div>
      )}

      {remoti && remoti.length > 0 && (
        <div className="aclist">
          <div className="aclist-head">Indirizzi trovati</div>
          {remoti.map((c, n) => (
            <button key={n}
              onClick={() => scegli({ zona: c.zona, etichetta: c.etichetta, descrizione: c.descrizione, preciso: !!c.preciso })}>
              <span>{c.etichetta}<small>zona {c.zona} · {c.descrizione}</small></span>
              <span className="zpill">{c.zona}</span>
            </button>
          ))}
        </div>
      )}

      {nota && <span className="hint">{nota}</span>}
    </div>
  );
}
