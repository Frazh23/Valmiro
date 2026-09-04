import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/sistema/Header";
import Reveal from "@/components/sistema/Reveal";
import { ZONE, SEMESTRE, FONTE, FASCIA_NOME, INDICE_ISTAT } from "@/lib/data";
import { eur } from "@/lib/formato";

export const metadata: Metadata = {
  title: "I quartieri di Milano · Stimami",
  description: "Le 42 zone omogenee OMI di Milano e le loro quotazioni ufficiali al metro quadro.",
};

/** Lettura sola: nessun calcolo nuovo, sono le quotazioni gia' caricate in lib/data. */
export default function Quartieri() {
  const righe = Object.entries(ZONE)
    .map(([id, z]) => {
      const f = z.civ.NORMALE || z.civ.OTTIMO;
      const alto = z.civ.OTTIMO?.[1] ?? f?.[1] ?? 0;
      return { id, z, min: (f?.[0] ?? 0) * INDICE_ISTAT, max: alto * INDICE_ISTAT };
    })
    .sort((a, b) => b.max - a.max);

  return (
    <div className="v-page">
      <Header />
      <main className="v-fill">
        <section className="v-wrap v-section">
          <p className="v-eyebrow">Milano</p>
          <h1 className="v-h1" style={{ marginTop: "var(--s-4)", maxWidth: "16ch" }}>
            Le {righe.length} zone in cui si formano i prezzi
          </h1>
          <p className="v-lead v-measure" style={{ marginTop: "var(--s-5)" }}>
            L&apos;Agenzia delle Entrate divide Milano in zone omogenee e per ognuna pubblica una
            forbice di euro al metro quadro. Sono i valori su cui Stimami costruisce ogni stima,
            aggiornati all&apos;indice Istat. Semestre di riferimento: {SEMESTRE}.
          </p>

          <div className="v-factors" style={{ maxWidth: "none", marginTop: "clamp(40px,6vw,72px)" }}>
            {righe.map((r, n) => (
              <Reveal key={r.id} delay={Math.min(n, 8) * 40}>
                <div className="v-factor">
                  <span className="v-factor__n">
                    <b style={{ color: "var(--ink)", fontWeight: 550 }}>{r.z.d}</b>
                    <small style={{ display: "block", color: "var(--ink-faint)", fontSize: "var(--t-micro)" }}>
                      Zona {r.id} · {FASCIA_NOME[r.z.f]}
                    </small>
                  </span>
                  <span className="v-factor__v">{eur(r.min)} – {eur(r.max)} €/mq</span>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="v-actions">
            <Link className="v-btn v-btn--accent" href="/valuta">Valuta la tua casa</Link>
          </div>
        </section>
      </main>
      <footer className="v-footer">
        <div className="v-wrap v-footer__in">
          <span className="v-brand" aria-label="Stimami">Stimam<span aria-hidden="true">i</span></span>
          <p className="v-micro">{FONTE}. Le stime sono indicative e non costituiscono perizia.</p>
        </div>
      </footer>
    </div>
  );
}
