import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/sistema/Header";
import Logo from "@/components/sistema/Logo";
import { SEMESTRE, FONTE } from "@/lib/data";

export const metadata: Metadata = {
  title: "Valmiro in English · what a Milan home is worth",
  description:
    "Valmiro estimates the value of a home in Milan from the official OMI figures of the Italian Revenue Agency. What the estimate is, what it is not, and the vocabulary you need to use the Italian form.",
  alternates: { languages: { en: "https://valmiro.it/en", fr: "https://valmiro.it/fr" } },
};

/**
 * Pagina in inglese. Non e' la traduzione del sito: e' la pagina che serve a chi
 * arriva da fuori e trova uno strumento in italiano. Spiega da dove vengono i
 * numeri (l'OMI a un inglese non dice niente), che cosa la stima non e', e da'
 * il vocabolario dei campi del modulo. Le frasi che pesano — «non e' una
 * perizia» — sono scritte, non convertite: l'originale italiano resta quello
 * che fa fede, e la pagina lo dice.
 */
export default function English() {
  /* «2025 · 2° semestre» va detto in inglese, non lasciato a meta': si legge il
     dato dal motore e si compone la frase qui. */
  const [anno, sem] = SEMESTRE.split(" · ");
  const periodo = `${sem.startsWith("1") ? "the first" : "the second"} half of ${anno}`;

  return (
    <div className="v-page" lang="en">
      <Header />
      <main className="v-fill">
        <article className="v-wrap v-section v-section--op v-prose v-narrow">
          <p className="v-eyebrow">In English</p>
          <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>What is this flat worth?</h1>
          <p className="v-lead" style={{ marginTop: "var(--s-5)" }}>
            Valmiro estimates what a home in Milan is worth, using the official price figures the Italian
            Revenue Agency publishes for every part of the city. It shows you the calculation line by line,
            so you can disagree with it.
          </p>

          <h2>Where the numbers come from</h2>
          <p>
            Italy has something many countries don&apos;t: a public, official price register. Twice a year the{" "}
            <b>Agenzia delle Entrate</b> (the Revenue Agency) publishes, through its property market observatory
            (<i>Osservatorio del Mercato Immobiliare</i>, OMI), a range of euros per square metre for every one of
            Milan&apos;s 42 homogeneous zones, for each type of property and for two states of repair. Valmiro starts
            from those figures — currently {periodo} — and applies stated
            coefficients for floor, lift, condition, balconies and the rest. Zone boundaries and the register of
            street numbers come from the City of Milan.
          </p>
          <p>
            Nothing is scraped from listing portals, and no price is invented. If a figure moves the result, the
            result page tells you by how much.
          </p>

          <h2>What the estimate is not</h2>
          <p>
            This is an <b>automated indicative estimate</b>. It is not a survey, not a formal appraisal, and it has
            no legal standing: in Italy that document is a <i>perizia</i>, signed by a qualified professional who has
            actually visited the property. Valmiro has never seen the flat. It does not know the view, the state of
            the building, the neighbours, the extraordinary works the owners voted last spring, or whether the
            windows face a courtyard or a tram line.
          </p>
          <p>
            The result is a central figure with a range around it, and the range is the honest part: it is the
            model&apos;s own uncertainty, not a negotiating margin. Two identical flats on paper can be worth
            fifteen per cent apart in reality.
          </p>

          <h2>How to read the result</h2>
          <p>
            You get a value and a range, a reliability rating, and then the reasons: which zone figure was used,
            what each characteristic added or subtracted, what renovation would cost item by item, what the flat
            would yield if rented, and how the zone has moved since 2014. Anything the model assumed rather than
            knew is listed as an assumption, in plain words, next to the number.
          </p>

          <h2>The form is in Italian — here is the vocabulary</h2>
          <p>
            The tool itself is in Italian, and it stays that way: the wording has been written carefully, and a
            machine translation of a legal disclaimer is worth less than none. Your browser can translate the pages
            for reading. Where it matters — privacy, terms, the disclaimer next to every result — the Italian text
            is the one that counts.
          </p>
          <p>These are the fields you will meet:</p>
          <dl className="v-glossario">
            <div><dt>Voglio comprare / Voglio vendere</dt><dd>I want to buy / I want to sell. It changes the questions and the tools, never the value.</dd></div>
            <div><dt>Superficie</dt><dd>Floor area. <b>Commerciale</b> is the Italian convention used in listings and deeds: it includes walls and, at a reduced rate, balconies and cellar. <b>Calpestabile</b> is the walkable area.</dd></div>
            <div><dt>Balconi · Terrazzi · Cantina o soffitta</dt><dd>Balconies · terraces · cellar or attic store. Ask yourself whether they are already inside the square metres you typed.</dd></div>
            <div><dt>In che stato è</dt><dd>Condition: <i>da ristrutturare</i> (needs renovation), <i>abitabile</i> (habitable), <i>ottimo stato</i> (excellent), <i>nuova</i> (new).</dd></div>
            <div><dt>Piano</dt><dd>Floor. <i>Piano terra</i> is the ground floor; <i>seminterrato</i> is a basement flat, for which the model gives only an explicit simulation, not a valuation.</dd></div>
            <div><dt>Ascensore</dt><dd>Lift. From the third floor up it matters a great deal.</dd></div>
            <div><dt>Classe energetica</dt><dd>Energy rating, A to G. «Non la conosco» means you don&apos;t know it.</dd></div>
            <div><dt>Categoria catastale</dt><dd>Cadastral category, from A/1 to A/11: it tells the model whether the flat is <i>civile</i> (ordinary), <i>signorile</i> (high-end) or <i>economica</i>.</dd></div>
            <div><dt>Luminosità</dt><dd>How much light it gets.</dd></div>
            <div><dt>Box o posto auto</dt><dd>Garage or parking space, and whether it is sold separately.</dd></div>
            <div><dt>Prezzo richiesto</dt><dd>The asking price, if you are looking at a listing. Give it and Valmiro will tell you how it compares.</dd></div>
          </dl>

          <p style={{ marginTop: "var(--s-8)" }}>
            <Link className="v-btn v-btn--accent" href="/valuta">Value a home</Link>
            {" "}
            <Link className="v-btn v-btn--bare" href="/fr">En français</Link>
          </p>
          <p className="v-small">
            Questions, or an error to report: <a href="mailto:informazioni@valmiro.it">informazioni@valmiro.it</a>.
            Our <Link href="/privacy">privacy notice</Link> is in Italian.
          </p>
        </article>
      </main>
      <footer className="v-footer">
        <div className="v-wrap v-footer__in">
          <Logo link={false} size="sm" />
          <p className="v-micro">
            {FONTE}. Estimates are indicative and are not a formal valuation.
            {" "}<Link href="/privacy">Privacy</Link>
            {" · "}<a href="mailto:informazioni@valmiro.it">informazioni@valmiro.it</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
