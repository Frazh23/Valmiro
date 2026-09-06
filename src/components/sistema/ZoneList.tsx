"use client";
import { useMemo, useState } from "react";
import { eur } from "@/lib/formato";

export type RigaZona = { id: string; nome: string; fascia: string; min: number; max: number };

/**
 * L'elenco delle 42 zone con una ricerca per nome o codice OMI. Filtra quello che
 * gia' c'e': nessuna mappa, nessun dato in piu'. Il conteggio dei risultati e'
 * annunciato, cosi' chi usa uno screen reader sa che l'elenco e' cambiato.
 */
export default function ZoneList({ righe }: { righe: RigaZona[] }) {
  const [q, setQ] = useState("");
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visibili = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return righe;
    return righe.filter((r) => norm(r.nome).includes(t) || norm(r.id).includes(t) || norm(r.fascia).includes(t));
  }, [q, righe]);

  return (
    <>
      <div className="v-field" style={{ maxWidth: 520, marginTop: "clamp(32px,5vw,56px)" }}>
        <label className="v-field__lbl" htmlFor="cerca-zona">Cerca una zona</label>
        <input id="cerca-zona" className="v-input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
               placeholder="Isola, Porta Romana, C15…" autoComplete="off" aria-describedby="cerca-zona-esito" />
        <span className="v-field__hint" id="cerca-zona-esito" role="status">
          {q.trim() ? `${visibili.length} ${visibili.length === 1 ? "zona" : "zone"} su ${righe.length}` : `${righe.length} zone, dalla più cara alla meno cara`}
        </span>
      </div>

      <div className="v-factors" style={{ maxWidth: "none", marginTop: "var(--s-6)" }}>
        {visibili.map((r) => (
          <div className="v-factor" key={r.id}>
            <span className="v-factor__n">
              <b style={{ color: "var(--ink)", fontWeight: 550 }}>{r.nome}</b>
              <small style={{ display: "block", color: "var(--ink-faint)", fontSize: "var(--t-small)" }}>
                Zona {r.id} · {r.fascia}
              </small>
            </span>
            <span className="v-factor__v">{eur(r.min)} – {eur(r.max)} €/mq</span>
          </div>
        ))}
        {visibili.length === 0 && <p className="v-body" style={{ padding: "var(--s-5) 0" }}>Nessuna zona corrisponde a «{q}». Prova con il nome del quartiere o il codice, come C15.</p>}
      </div>
    </>
  );
}
