import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/sistema/Header";
import Logo from "@/components/sistema/Logo";
import ZoneList from "@/components/sistema/ZoneList";
import { ZONE, SEMESTRE, FONTE, FASCIA_NOME, INDICE_ISTAT } from "@/lib/data";

export const metadata: Metadata = {
  title: "I quartieri di Milano · Valmiro",
  description: "Le 42 zone omogenee OMI di Milano e le loro quotazioni ufficiali al metro quadro.",
};

/** Lettura sola: nessun calcolo nuovo, sono le quotazioni gia' caricate in lib/data. */
export default function Quartieri() {
  const righe = Object.entries(ZONE)
    .map(([id, z]) => {
      const f = z.civ.NORMALE || z.civ.OTTIMO;
      const alto = z.civ.OTTIMO?.[1] ?? f?.[1] ?? 0;
      return { id, nome: z.d, fascia: FASCIA_NOME[z.f], min: (f?.[0] ?? 0) * INDICE_ISTAT, max: alto * INDICE_ISTAT };
    })
    .sort((a, b) => b.max - a.max);

  return (
    <div className="v-page">
      <Header />
      <main className="v-fill">
        <section className="v-wrap v-section v-section--op">
          <p className="v-eyebrow">Milano</p>
          <h1 className="v-h1" style={{ marginTop: "var(--s-4)", maxWidth: "16ch" }}>
            Le {righe.length} zone in cui si formano i prezzi
          </h1>
          <p className="v-lead v-measure" style={{ marginTop: "var(--s-5)" }}>
            L&apos;Agenzia delle Entrate divide Milano in zone omogenee e per ognuna pubblica una
            forbice di euro al metro quadro. Sono i valori su cui Valmiro costruisce ogni stima,
            aggiornati all&apos;indice Istat. Semestre di riferimento: {SEMESTRE}.
          </p>

          <ZoneList righe={righe} />

          <div className="v-actions">
            <Link className="v-btn v-btn--accent" href="/valuta">Valuta la tua casa</Link>
          </div>
        </section>
      </main>
      <footer className="v-footer">
        <div className="v-wrap v-footer__in">
          <Logo link={false} size="sm" />
          <p className="v-micro">
            {FONTE}. Le stime sono indicative e non costituiscono perizia.
            {" "}<Link href="/privacy">Privacy</Link>
            {" · "}<a href="mailto:informazioni@valmiro.it">informazioni@valmiro.it</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
