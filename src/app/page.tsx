import Link from "next/link";
import Header from "@/components/sistema/Header";
import HeroFoto from "@/components/sistema/HeroFoto";
import HomeSearch from "@/components/sistema/HomeSearch";
import Logo from "@/components/sistema/Logo";
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
            a tutta larghezza, con la stessa dissolvenza dall'alto.
            Su schermo largo le quattro fotografie si alternano: il componente
            HeroFoto tiene la rotazione, i comandi e le pause. Sono immagini
            illustrative generate, non immobili in vendita: decorative, quindi,
            e dichiarate come tali nel piede della pagina. */}
        <section className="v-hero v-hero--foto">
          <HeroFoto />
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
              Dalla parte di chi compra e di chi vende: lo stesso valore, <em>detto per intero</em>.
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="v-footer">
        <div className="v-wrap v-footer__in">
          <Logo link={false} size="sm" />
          <p className="v-micro">
            {FONTE}. Le stime sono indicative e non costituiscono perizia.
            {" "}Le fotografie sono illustrazioni, non immobili in vendita.
            {" "}<Link href="/privacy">Privacy</Link>
            {" · "}<a href="mailto:informazioni@valmiro.it">informazioni@valmiro.it</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
