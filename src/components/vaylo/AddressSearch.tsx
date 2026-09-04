"use client";
import { useEffect, useRef, useState } from "react";
import { cercaZona } from "@/lib/data";
import type { Scelta } from "@/lib/types";

/**
 * Campo indirizzo.
 * Mentre si scrive i suggerimenti arrivano dal dizionario locale: istantanei,
 * senza rete. Il geocoder vero (/api/geocode) parte solo alla conferma, perche'
 * Nominatim ammette una richiesta al secondo e chiamarlo a ogni tasto ci farebbe
 * bloccare. Nessuna logica di ricerca vive qui: e' tutta in lib/data e nella rotta.
 */
export default function AddressSearch({
  onScegli, azione = "Valuta ora", valoreIniziale = "", autoFocus = false,
}: {
  onScegli: (s: Scelta) => void;
  azione?: string;
  valoreIniziale?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(valoreIniziale);
  const [locali, setLocali] = useState<{ nome: string; zona: string; descrizione: string }[]>([]);
  const [remoti, setRemoti] = useState<Scelta[] | null>(null);
  const [cerco, setCerco] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [attivo, setAttivo] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fuori = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) chiudi();
    };
    addEventListener("mousedown", fuori);
    return () => removeEventListener("mousedown", fuori);
  }, []);

  const chiudi = () => { setLocali([]); setRemoti(null); setAttivo(-1); };

  function digita(v: string) {
    setQ(v); setRemoti(null); setNota(null); setAttivo(-1);
    setLocali(v.trim().length >= 2 ? cercaZona(v, 6) : []);
  }

  async function conferma() {
    if (cerco) return;
    /* Meglio riportare il fuoco nel campo che presentare una CTA spenta:
       un bottone disabilitato all'arrivo si legge come sito rotto. */
    if (q.trim().length < 3) { campo.current?.focus(); return; }
    setCerco(true); setLocali([]); setNota(null); setAttivo(-1);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((x) => x.json());
      const c: Scelta[] = r.candidati || [];
      if (c.length === 1 && r.metodo === "geocoder") { scegli(c[0]); return; }
      setRemoti(c);
      if (!c.length) setNota(r.motivo || "Nessun indirizzo trovato. Prova con la via e il civico.");
      else if (r.metodo === "dizionario") setNota(r.motivo);
    } catch {
      setNota("Ricerca non riuscita. Riprova fra un istante.");
    } finally {
      setCerco(false);
    }
  }

  function scegli(s: Scelta) { setQ(s.etichetta); chiudi(); setNota(null); onScegli(s); }

  const lista: Scelta[] = remoti
    ? remoti
    : locali.map((c) => ({ zona: c.zona, etichetta: c.nome, descrizione: c.descrizione, preciso: false }));

  function tasto(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && lista.length) { e.preventDefault(); setAttivo((n) => (n + 1) % lista.length); }
    else if (e.key === "ArrowUp" && lista.length) { e.preventDefault(); setAttivo((n) => (n <= 0 ? lista.length : n) - 1); }
    else if (e.key === "Enter") { e.preventDefault(); attivo >= 0 && lista[attivo] ? scegli(lista[attivo]) : conferma(); }
    else if (e.key === "Escape") chiudi();
  }

  return (
    <div className="v-address" ref={box}>
      <div className="v-address__field">
        <input
          ref={campo}
          value={q}
          onChange={(e) => digita(e.target.value)}
          onKeyDown={tasto}
          placeholder="Via Savona 35, Milano"
          aria-label="Indirizzo dell'immobile"
          autoComplete="off" autoCorrect="off" spellCheck={false}
          autoFocus={autoFocus}
          enterKeyHint="search"
        />
        <button className="v-btn v-btn--accent v-address__go" onClick={conferma} disabled={cerco}>
          {cerco ? "Cerco…" : azione}
        </button>
      </div>

      {lista.length > 0 && (
        <div className="v-suggest" role="listbox">
          <div className="v-suggest__head">{remoti ? "Indirizzi trovati" : "Vie e quartieri che conosco"}</div>
          {lista.map((c, n) => (
            <button key={c.etichetta + c.zona + n} role="option" aria-selected={n === attivo}
                    data-active={n === attivo} onClick={() => scegli(c)}>
              <span className="v-suggest__name">
                <b>{c.etichetta}</b>
                <small>{c.descrizione}</small>
              </span>
              <span className="v-zpill">{c.zona}</span>
            </button>
          ))}
          {!remoti && (
            <div className="v-suggest__foot">Invio per cercare l&apos;indirizzo esatto con il civico</div>
          )}
        </div>
      )}

      {nota && <p className="v-small v-address__note">{nota}</p>}
    </div>
  );
}
