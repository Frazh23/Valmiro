"use client";
import { useEffect, useRef, useState } from "react";
import type { Scelta } from "@/lib/types";

type Suggerimento = {
  etichetta: string; zona: string; descrizione: string;
  civici: number; multizona: boolean;
};
type CivicoSuggerito = { etichetta: string; civico: string; zona: string; descrizione: string };
type Risposta = {
  vie: Suggerimento[];
  via?: string; civicoCercato?: string; civici?: CivicoSuggerito[]; vicini?: boolean;
};

/** Una riga della tendina, qualunque cosa rappresenti: sa da sola cosa fare se scelta. */
type Riga = { etichetta: string; zona: string; descrizione: string; nota: string; scegli: () => void };

/**
 * Campo indirizzo.
 *
 * I suggerimenti arrivano da /api/vie, cioe' dalle 4.030 vie dell'anagrafe
 * comunale: sono dati nostri, quindi si possono chiedere a ogni tasto: nessun
 * limite di frequenza come con Nominatim. L'attesa breve serve solo a non
 * mandare una richiesta per lettera.
 *
 * Alla conferma passa da /api/geocode, che risolve il civico. Nessuna logica di
 * ricerca vive qui: sta tutta in lib/indirizzario e nelle rotte.
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
  const [vie, setVie] = useState<Risposta>({ vie: [] });
  const [remoti, setRemoti] = useState<Scelta[] | null>(null);
  const [cerco, setCerco] = useState(false);
  const [nota, setNota] = useState<string | null>(null);
  const [attivo, setAttivo] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  /* L'ultima richiesta partita. Le risposte possono tornare fuori ordine e una
     lenta di tre lettere fa non deve sovrascrivere quella che si sta leggendo. */
  const turno = useRef(0);

  useEffect(() => {
    const fuori = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) chiudi();
    };
    addEventListener("mousedown", fuori);
    return () => removeEventListener("mousedown", fuori);
  }, []);

  const chiudi = () => { setVie({ vie: [] }); setRemoti(null); setAttivo(-1); };

  function digita(v: string) {
    setQ(v); setRemoti(null); setNota(null); setAttivo(-1);
    if (v.trim().length < 2) { setVie({ vie: [] }); return; }
    const mio = ++turno.current;
    const t = setTimeout(async () => {
      try {
        const r: Risposta = await fetch(`/api/vie?q=${encodeURIComponent(v)}`).then((x) => x.json());
        if (turno.current === mio) setVie(r.vie ? r : { vie: [] });
      } catch { /* i suggerimenti sono un di più: se cadono, si cerca lo stesso */ }
    }, 130);
    return () => clearTimeout(t);
  }

  async function conferma(testo = q) {
    if (cerco) return;
    /* Meglio riportare il fuoco nel campo che presentare una CTA spenta:
       un bottone disabilitato all'arrivo si legge come sito rotto. */
    if (testo.trim().length < 3) { campo.current?.focus(); return; }
    setCerco(true); setVie({ vie: [] }); setNota(null); setAttivo(-1);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(testo)}`).then((x) => x.json());
      const c: Scelta[] = r.candidati || [];
      if (c.length === 1 && r.trovato && !r.motivo) { scegli(c[0]); return; }
      setRemoti(c);
      if (!c.length) setNota(r.motivo || "Nessun indirizzo trovato. Prova con la via e il civico.");
      else if (r.motivo) setNota(r.motivo);
    } catch {
      setNota("Ricerca non riuscita. Riprova fra un istante.");
    } finally {
      setCerco(false);
    }
  }

  function scegli(s: Scelta) { setQ(s.etichetta); chiudi(); setNota(null); onScegli(s); }

  /**
   * Scegliere una via dall'elenco non e' scegliere un indirizzo: se nel campo
   * c'e' gia' un civico lo si porta dietro, cosi' "savona 35" cliccato su
   * "Via Savona" arriva al portone e non al centro della via.
   */
  function scegliVia(v: Suggerimento) {
    const numero = q.trim().match(/(\d+\s*[\/-]?\s*[a-zA-Z]?)\s*$/)?.[1]?.trim();
    const testo = numero ? `${v.etichetta} ${numero}` : v.etichetta;
    setQ(testo);
    if (numero) { conferma(testo); return; }
    chiudi();
    onScegli({
      zona: v.zona, etichetta: v.etichetta, descrizione: v.descrizione,
      fonte: "via", preciso: false,
    });
  }

  /* I civici vengono prima delle vie: se l'anagrafe ne propone, e' perche' nel
     campo c'e' gia' un numero, e un portone e' una risposta migliore di una via. */
  const righe: Riga[] = remoti
    ? remoti.map((c) => ({ etichetta: c.etichetta, zona: c.zona, descrizione: c.descrizione, nota: "", scegli: () => scegli(c) }))
    : [
        ...(vie.civici || []).map((c) => ({
          etichetta: c.etichetta, zona: c.zona, descrizione: c.descrizione, nota: "",
          scegli: () => scegli({ zona: c.zona, etichetta: c.etichetta, descrizione: c.descrizione, fonte: "anagrafe", preciso: true }),
        })),
        ...vie.vie.map((v) => ({
          etichetta: v.etichetta, zona: v.zona, descrizione: v.descrizione,
          nota: v.multizona ? "serve il civico" : "",
          scegli: () => scegliVia(v),
        })),
      ];

  const titolo = remoti
    ? "Indirizzi trovati"
    : vie.civici?.length
      ? vie.vicini
        ? `Il ${vie.civicoCercato} non risulta in ${vie.via} · i più vicini`
        : `Civici di ${vie.via}`
      : "Vie di Milano";

  function tasto(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && righe.length) { e.preventDefault(); setAttivo((n) => (n + 1) % righe.length); }
    else if (e.key === "ArrowUp" && righe.length) { e.preventDefault(); setAttivo((n) => (n <= 0 ? righe.length : n) - 1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (attivo >= 0 && righe[attivo]) righe[attivo].scegli(); else conferma();
    }
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
        <button className="v-btn v-btn--accent v-address__go" onClick={() => conferma()} disabled={cerco}>
          {cerco ? "Cerco…" : azione}
        </button>
      </div>

      {righe.length > 0 && (
        <div className="v-suggest" role="listbox">
          <div className="v-suggest__head">{titolo}</div>
          {righe.map((c, n) => (
            <button key={c.etichetta + c.zona + n} role="option" aria-selected={n === attivo}
                    data-active={n === attivo} onClick={c.scegli}>
              <span className="v-suggest__name">
                <b>{c.etichetta}</b>
                <small>{c.nota ? `${c.descrizione} · ${c.nota}` : c.descrizione}</small>
              </span>
              <span className="v-zpill">{c.zona}</span>
            </button>
          ))}
          {!remoti && !vie.civici?.length && (
            <div className="v-suggest__foot">Aggiungi il numero civico per la stima più precisa</div>
          )}
        </div>
      )}

      {nota && <p className="v-small v-address__note">{nota}</p>}
    </div>
  );
}
