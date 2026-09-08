import Link from "next/link";
import Valutazione from "@/components/sistema/Valutazione";
import { ZONE, SEMESTRE, INDICE_ISTAT } from "@/lib/data";
import { eur } from "@/lib/formato";

/**
 * La pagina della valutazione, lato server.
 *
 * Lo strumento e' un componente client e resta tale: legge i parametri
 * dell'indirizzo e tiene lo stato del modulo. Ma una pagina interamente client
 * arriva a un motore di ricerca vuota — questa ci arrivava con ventisette
 * parole, ed e' la pagina del prodotto. Qui sotto c'e' del testo vero, reso dal
 * server, che finisce nell'HTML e serve anche a chi ci arriva per la prima
 * volta senza sapere che cos'e' Valmiro.
 *
 * Regola per chi lo modifichera': **niente riempitivo**. Ogni frase qui deve
 * essere vera e utile a chi la legge davvero. Una pagina gonfiata di parole per
 * i motori di ricerca e' esattamente il contrario di quello che questo sito e'.
 */

const nomeBreve = (d: string) => (d.includes("·") ? d.split("·").pop()!.trim() : d);

export default function Pagina() {
  /* Sei zone fra le piu' cercate, come porta d'ingresso alle 42 pagine: chi
     arriva qui da una ricerca generica trova comunque la strada per il numero
     della sua zona. */
  const inVetrina = ["B15", "C12", "C18", "D21", "B12", "D24"]
    .filter((z) => ZONE[z])
    .map((z) => ({ id: z, nome: nomeBreve(ZONE[z].d), da: ((ZONE[z].civ.NORMALE || ZONE[z].civ.OTTIMO)?.[0] ?? 0) * INDICE_ISTAT }));

  return (
    <Valutazione
      coda={
        <section className="v-wrap v-section v-narrow" style={{ borderTop: "1px solid var(--line)" }}>
          <h2 className="v-h3">In breve, come funziona</h2>
          <p className="v-body v-measure">
            Valmiro parte dalle <b>quotazioni ufficiali dell&apos;Agenzia delle Entrate</b> — l&apos;Osservatorio del
            Mercato Immobiliare pubblica, per ognuna delle {Object.keys(ZONE).length} zone di Milano e per ogni
            tipologia, una forbice di euro al metro quadro ({SEMESTRE}). Da lì applica i coefficienti dichiarati del
            motore — piano, ascensore, stato conservativo, balconi, classe energetica — e ogni riga del calcolo è
            mostrata nel risultato: se una voce non convince, si vede e si cambiano i dati.
          </p>
          <p className="v-body v-measure">
            Servono l&apos;indirizzo con il numero civico, i metri quadri e poche altre cose. Chi ha davanti un
            annuncio può incollarne il testo: lo legge il browser, non esce da lì, e il modulo si riempie da solo.
            Quello che non viene dichiarato resta un&apos;ipotesi, e le ipotesi sono scritte accanto al numero.
          </p>
          <p className="v-body v-measure">
            Il risultato non è solo un valore: c&apos;è l&apos;intervallo con la sua affidabilità, quanto costerebbe
            sistemare la casa intervento per intervento con le detrazioni, quanto renderebbe affittata con un 4+4 o
            a notte, e come si è mossa la zona dal 2014.
          </p>

          <h2 className="v-h3" style={{ marginTop: "var(--s-7)" }}>Che cosa una stima automatica non sa</h2>
          <p className="v-body v-measure">
            Non ha visto la casa. Non conosce la vista, il piano nobile, lo stato del palazzo, il vicinato, i lavori
            straordinari votati in assemblea. È una <b>stima automatica indicativa e non costituisce perizia</b>:
            per quella serve un professionista che entri dentro. Quanto sbagliamo, misurato e pubblicato, sta
            nella <Link href="/metodo" className="v-link">pagina del metodo</Link> — e per quel che ne sappiamo
            siamo gli unici in Italia a scriverlo.
          </p>

          <h2 className="v-h3" style={{ marginTop: "var(--s-7)" }}>I prezzi zona per zona</h2>
          <p className="v-body v-measure">
            Ogni zona di Milano ha la sua pagina, con le quotazioni, i canoni di locazione e l&apos;andamento dal
            2014:
          </p>
          <div className="v-factors" style={{ marginTop: "var(--s-4)" }}>
            {inVetrina.map((z) => (
              <Link className="v-factor" key={z.id} href={`/quartieri/${z.id.toLowerCase()}`} style={{ textDecoration: "none" }}>
                <span className="v-factor__n">{z.nome} <small style={{ color: "var(--ink-faint)" }}>· {z.id}</small></span>
                <span className="v-factor__v">da {eur(z.da)} €/mq</span>
              </Link>
            ))}
          </div>
          <p className="v-small" style={{ marginTop: "var(--s-4)" }}>
            <Link href="/quartieri" className="v-link">Tutte le {Object.keys(ZONE).length} zone di Milano</Link>
          </p>
        </section>
      }
    />
  );
}
