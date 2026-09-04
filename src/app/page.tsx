import Link from "next/link";
import Testata from "@/components/Testata";
import { ZONE, SEMESTRE, FONTE } from "@/lib/data";

export default function Home() {
  const zone = Object.entries(ZONE);
  const prezzi = zone
    .map(([z, o]) => ({ z, d: o.d, min: (o.civ.NORMALE || o.civ.OTTIMO)![0] }))
    .sort((a, b) => a.min - b.min);
  const piuBassa = prezzi[0], piuAlta = prezzi[prezzi.length - 1];

  return (
    <main className="shell">
      <Testata />

      <section className="hero">
        <h1 className="hero-h">Quanto vale davvero<br />la tua casa a Milano</h1>
        <p className="hero-p">
          Vaylo costruisce la stima sulle quotazioni ufficiali dell&apos;Agenzia delle Entrate, non su
          una media presa da un annuncio. Ti diciamo da dove esce ogni euro, e ti diamo un
          intervallo onesto invece di un numero secco.
        </p>
        <div className="hero-cta">
          <Link href="/valuta" className="primary big">Valuta la tua casa</Link>
          <span className="mini">Gratis · nessuna registrazione · due minuti</span>
        </div>
      </section>

      <section className="numeri">
        <div className="num"><b>{zone.length}</b><span>zone OMI di Milano, con i perimetri ufficiali</span></div>
        <div className="num"><b>{eurI(piuBassa.min)}</b><span>€/mq nella zona più economica — {piuBassa.d}</span></div>
        <div className="num"><b>{eurI(piuAlta.min)}</b><span>€/mq nella più cara — {piuAlta.d}</span></div>
        <div className="num"><b>{SEMESTRE.split("·")[0].trim()}</b><span>semestre delle quotazioni in uso</span></div>
      </section>

      <section className="come">
        <h2>Come funziona</h2>
        <div className="passi">
          <div className="passo"><span className="n">01</span><b>Dove</b>
            <p>Scrivi via e civico o tocchi la mappa. Il punto cade dentro una delle 42 zone
            omogenee in cui l&apos;Agenzia delle Entrate divide Milano: è lì che si formano i prezzi.</p></div>
          <div className="passo"><span className="n">02</span><b>L&apos;immobile</b>
            <p>Superficie, stato, piano, ascensore, classe energetica. Poche domande, e ognuna
            sposta il risultato in modo che puoi vedere.</p></div>
          <div className="passo"><span className="n">03</span><b>La stima</b>
            <p>Un intervallo con il grado di affidabilità, il prezzo a cui pubblicare l&apos;annuncio
            se vendi o l&apos;offerta difendibile se compri, e il conto della ristrutturazione.</p></div>
        </div>
      </section>

      <section className="perche">
        <h2>Perché Vaylo non è il solito calcolatore</h2>
        <ul>
          <li><b>Dati ufficiali, non stime di stime.</b> Quotazioni e confini vengono dall&apos;Osservatorio
            del Mercato Immobiliare. La fonte e il semestre sono scritti accanto al risultato.</li>
          <li><b>Un intervallo, mai un numero secco.</b> E l&apos;ampiezza dell&apos;intervallo dipende da quanto
            è larga la forbice reale della tua zona: dove il mercato è più incerto, lo diciamo.</li>
          <li><b>Il calcolo è aperto.</b> Ogni coefficiente — piano, ascensore, classe — è mostrato in
            euro. Se non sei d&apos;accordo con un pezzo, lo vedi.</li>
          <li><b>Serve a vendere e a comprare.</b> Da un lato il prezzo di pubblicazione, dall&apos;altro
            quanto offrire e con quale argomento.</li>
        </ul>
      </section>

      <p className="foot">{FONTE}. Le stime sono indicative e non costituiscono perizia.</p>
    </main>
  );
}

function eurI(n: number) { return new Intl.NumberFormat("it-IT").format(n); }
