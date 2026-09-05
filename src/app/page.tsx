import Link from "next/link";
import Header from "@/components/sistema/Header";
import HomeSearch from "@/components/sistema/HomeSearch";
import Reveal from "@/components/sistema/Reveal";
import { ZONE, SEMESTRE, FONTE } from "@/lib/data";

const PASSI = [
  { n: "01", t: "Da che parte stai", d: "Compri o vendi? Il valore è lo stesso, cambiano le domande: se compri, incolla l'annuncio e ti diciamo se è caro; se vendi, ti diciamo a che prezzo case così vengono messe in vendita." },
  { n: "02", t: "La casa", d: "Indirizzo, superficie, stato, piano, balconi e terrazzi. Poche domande, e ognuna sposta il risultato di una cifra che ti mostriamo." },
  { n: "03", t: "Il valore e le decisioni", d: "Un intervallo con il suo grado di affidabilità, cosa costerebbe sistemarla intervento per intervento, quanto renderebbe affittata, com'è andata la zona." },
];

export default function Home() {
  const zone = Object.keys(ZONE).length;

  return (
    <div className="v-page">
      <Header />

      <main className="v-fill">
        {/* La foto non e' un oggetto nella pagina: e' il luogo. Sanguina dal bordo
            destro senza cornice e si dissolve nella carta, cosi' titolo e campo
            stanno sul panna dove si leggono. Su telefono scende sotto il campo,
            a tutta larghezza, con la stessa dissolvenza dall'alto. */}
        <section className="v-hero v-hero--foto">
          <img
            className="v-hero__foto"
            src="/hero/liberty.webp"
            srcSet="/hero/liberty-1280.webp 1280w, /hero/liberty.webp 2048w"
            sizes="(max-width: 900px) 100vw, 60vw"
            width={2048} height={1152}
            alt="Facciata di un palazzo Liberty di Milano con balconi in ferro battuto e biciclette, nella luce del primo mattino"
            loading="eager" fetchPriority="high" decoding="async"
          />
          <div className="v-wrap v-hero__in">
            <div className="v-hero__col">
              <p className="v-eyebrow">Milano</p>
              <h1 className="v-display v-hero__copy" style={{ marginTop: "var(--s-4)" }}>
                Quanto vale questa casa?
              </h1>
              <p className="v-lead v-hero__lead">
                Una stima per decidere meglio.
              </p>

              <div className="v-hero__form">
                <HomeSearch />
              </div>

              <div className="v-hero__proof">
                <span>{zone} zone OMI</span><i /><span>Dati ufficiali dell&apos;Agenzia delle Entrate</span>
                <i /><span>{SEMESTRE}</span>
              </div>
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
            {" · "}<a href="mailto:informazioni@valmiro.it">informazioni@valmiro.it</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
