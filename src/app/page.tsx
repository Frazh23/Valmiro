import Link from "next/link";
import Header from "@/components/sistema/Header";
import HomeSearch from "@/components/sistema/HomeSearch";
import PropertyVisual from "@/components/sistema/PropertyVisual";
import Reveal from "@/components/sistema/Reveal";
import { ZONE, SEMESTRE, FONTE } from "@/lib/data";

const PASSI = [
  { n: "01", t: "L'indirizzo", d: "Il punto cade dentro una delle 42 zone omogenee in cui l'Agenzia delle Entrate divide Milano. È lì che si formano i prezzi." },
  { n: "02", t: "La casa", d: "Superficie, stato, piano. Poche domande, e ognuna sposta il risultato di una cifra che ti mostriamo." },
  { n: "03", t: "Il valore", d: "Un intervallo con il suo grado di affidabilità, come si posiziona nella zona, e quanto varrebbe ristrutturata." },
];

export default function Home() {
  const zone = Object.keys(ZONE).length;

  return (
    <div className="v-page">
      <Header />

      <main className="v-fill">
        <section className="v-wrap v-hero">
          <div className="v-hero__grid">
            <div>
              <p className="v-eyebrow">Milano</p>
              <h1 className="v-display v-hero__copy" style={{ marginTop: "var(--s-4)" }}>
                Quanto vale davvero la tua casa
              </h1>
              <p className="v-lead v-hero__lead">
                Scopri il valore del tuo immobile, i prezzi della zona e il suo potenziale.
              </p>

              <div className="v-hero__form">
                <HomeSearch />
              </div>

              <div className="v-hero__proof">
                <span>{zone} zone OMI</span><i /><span>Dati ufficiali dell&apos;Agenzia delle Entrate</span>
                <i /><span>{SEMESTRE}</span>
              </div>
            </div>

            <div className="v-hero__visual">
              <PropertyVisual
                foto="angolo" fuoco="58% 50%" prioritaria
                alt="Palazzo d'angolo anni Trenta su un viale alberato di Milano, nella luce del primo mattino"
                didascalia="Milano" nota="Luce di taglio, primo mattino"
              />
            </div>
          </div>
        </section>

        <section className="v-band">
          <div className="v-wrap v-section">
            <Reveal>
              <p className="v-eyebrow" style={{ marginBottom: "var(--s-7)" }}>Come funziona</p>
            </Reveal>
            <div className="v-steps">
              {PASSI.map((p, n) => (
                <Reveal key={p.n} delay={n * 90}>
                  <div className="v-step">
                    <span className="v-numeral v-step__n">{p.n}</span>
                    <h3 className="v-h3">{p.t}</h3>
                    <p>{p.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="v-wrap v-section">
          <Reveal>
            <p className="v-statement">
              Non una media presa da un annuncio. Una stima che ti dice <em>da dove esce ogni euro</em>.
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="v-footer">
        <div className="v-wrap v-footer__in">
          <span className="v-brand" aria-label="Valmiro">Valmir<span aria-hidden="true">o</span></span>
          <p className="v-micro">
            {FONTE}. Le stime sono indicative e non costituiscono perizia.
            {" "}<Link href="/privacy">Privacy</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
