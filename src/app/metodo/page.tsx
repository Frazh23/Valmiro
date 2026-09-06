import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/sistema/Header";
import Logo from "@/components/sistema/Logo";
import { SEMESTRE, FONTE, INDICE_ISTAT } from "@/lib/data";
import { COEFF, PARAMETRI } from "@/lib/engine";

export const metadata: Metadata = {
  title: "Come calcoliamo la stima · Valmiro",
  description: "Il metodo di Valmiro, in chiaro: quotazioni OMI, coefficienti dichiarati, taratura sugli annunci, cosa i numeri misurano e cosa no.",
};

/**
 * La pagina pubblica del metodo. Riprende docs/taratura.md e docs/verifica.md, che
 * restano la fonte per chi lavora sul codice; qui c'e' la stessa sostanza scritta
 * per chi legge una stima e vuole sapere da dove esce. I numeri dei parametri si
 * leggono dal motore, non si ricopiano: se cambiano, cambia anche questa pagina.
 */
export default function Metodo() {
  const liv = PARAMETRI.livello, comp = PARAMETRI.compressioneStato;
  return (
    <div className="v-page">
      <Header />
      <main className="v-fill">
        <article className="v-wrap v-section v-section--op v-prose v-narrow">
          <p className="v-eyebrow">Il metodo</p>
          <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Come calcoliamo la stima</h1>
          <p className="v-lead" style={{ marginTop: "var(--s-5)" }}>
            Valmiro non inventa un prezzo: parte dalle quotazioni ufficiali della zona e applica coefficienti dichiarati, che
            la pagina del risultato mostra uno per uno. Qui c&apos;è tutto il resto: da dove vengono i numeri, come sono stati
            tarati, che cosa misurano e che cosa no.
          </p>

          <h2 id="dati">I dati</h2>
          <p>
            Le quotazioni sono quelle dell&apos;<b>Osservatorio del Mercato Immobiliare</b> dell&apos;Agenzia delle Entrate, semestre {SEMESTRE},
            ricevute con la fornitura ufficiale: per ognuna delle 42 zone omogenee di Milano, e per ogni tipologia (civile, signorile,
            economica, ville), una forbice di euro al metro quadro per lo stato «normale» e per lo stato «ottimo», più i canoni di
            locazione. I perimetri delle zone e l&apos;anagrafe dei numeri civici vengono dal Comune di Milano (licenza CC BY 4.0): è così
            che un indirizzo diventa una zona senza passare da servizi esterni.
          </p>
          <p>
            Le quotazioni escono con mesi di ritardo: le portiamo a oggi con l&apos;indice Istat dei prezzi delle abitazioni
            (oggi ×{INDICE_ISTAT}). Per gli affitti non usiamo nessun indice.
          </p>

          <h2 id="valore">Il valore</h2>
          <p>
            La <b>base</b> è il punto medio della forbice OMI della zona per lo stato normale, moltiplicata per un livello di fascia
            tarato sugli annunci (centro {liv.B}, semicentro {liv.C}, periferia {liv.D}). Lo <b>stato conservativo</b> sposta la base:
            «da ristrutturare» vale il {Math.round(PARAMETRI.scontoRist * 100)}% della base; «ottimo» e «nuova» salgono verso la forbice
            «ottimo» con un premio compresso (esponente {comp.B} in centro e semicentro, {comp.D} in periferia), perché dentro ogni
            forbice c&apos;è anche la posizione nella zona, che non cambia ristrutturando.
          </p>
          <p>
            La <b>superficie commerciale</b> segue il DPR 138/1998, allegato C: balconi e terrazzi contano al {COEFF.pertinenzeQuota1 * 100}% fino a
            {COEFF.pertinenzeSoglia} m² e al {COEFF.pertinenzeQuota2 * 100}% oltre; la cantina vale {COEFF.cantinaMq} m²; da una superficie
            calpestabile alla commerciale si aggiunge il {Math.round((COEFF.muri - 1) * 100)}% di muri, che è una media dichiarata.
          </p>
          <p>
            Poi i <b>coefficienti</b>, tutti moltiplicativi e tutti in vista nel dettaglio: piano (da {COEFF.piano.terra} per il piano terra a
            {COEFF.piano.ultimo} per l&apos;ultimo), ascensore (senza, {COEFF.senzaAscensoreAlto} dal terzo piano in su), classe energetica
            (da {COEFF.classe.G} per la G a {COEFF.classe.A} per la A; «non la conosco» non applica nulla), luminosità. Il box vale la quotazione
            OMI dei box della zona per {COEFF.boxMq} m², tenuta separata dal valore dell&apos;abitazione.
          </p>
          <p>
            L&apos;<b>incertezza</b> non è una costante: nasce dalla larghezza della forbice OMI della zona, cresce se lo stato dichiarato è
            incerto e per le case grandi, si allarga nel segmento di pregio, dove le quotazioni «signorile» hanno un tetto che il
            mercato supera. L&apos;intervallo che vedi è il valore centrale più e meno questa incertezza.
          </p>

          <h2 id="prezzi">I prezzi, che non sono il valore</h2>
          <p>
            Il <b>prezzo richiesto</b> in un annuncio è un&apos;intenzione, non un valore. Il <b>prezzo di pubblicazione possibile</b> che
            mostriamo a chi vende è il valore centrale più il {Math.round(COEFF.margineTrattativa * 100)}%: una convenzione del motore che la
            taratura ha allineato, in mediana, ai prezzi richiesti degli annunci; non è una percentuale di trattativa misurata su
            compravendite. L&apos;<b>intervallo per un&apos;offerta</b> che mostriamo a chi compra è la metà bassa dell&apos;intervallo di stima:
            un criterio, non una previsione di quanto il venditore scenderà.
          </p>

          <h2 id="taratura">La taratura</h2>
          <p>
            Il motore è stato tarato il 5 settembre 2026 su <b>201 annunci di vendita</b> a Milano, raccolti dai portali con una ricerca
            assistita e verificati a campione (12 riletti a mano: prezzi e metri confermati in tutti, due stati corretti). Per ogni annuncio
            il motore riceve gli stessi dati che riceverebbe da te e produce il prezzo di pubblicazione stimato; lo si confronta con il prezzo
            richiesto, in logaritmo. Rimisurato sul codice di oggi (7 settembre 2026): scarto mediano +1,9%, dispersione (MAD) 13,7%,
            35% degli annunci entro ±10% e 63% entro ±20%; sulle sole tipologie civili, fuori dal segmento di pregio, MAD 11,6% e 44%
            entro ±10%. Sono pochi parametri (quattro), scelti a griglia con la mediana come bersaglio. I coefficienti sono rimasti
            quelli scelti il 5 settembre: da allora quotazioni e conversione dei dati sono cambiate, e la mediana non è più a zero.
            Non l&apos;abbiamo riportata a zero: sarebbe inseguire il campione su cui il modello è già stato tarato.
          </p>
          <p>
            <b>Che cosa misurano questi numeri.</b> Quanto le stime somigliano a ciò che i venditori chiedono, non a ciò che gli acquirenti
            pagano: nessuno degli annunci porta un prezzo di compravendita. E sono numeri calcolati sugli stessi annunci usati per tarare:
            sono ottimistici per costruzione.
          </p>

          <h2 id="verifica">La verifica indipendente</h2>
          <p>
            <b>Protocollo predisposto; validazione indipendente non ancora eseguita.</b> Il protocollo: lotti di verifica separati da
            quelli di taratura; duplicati e ripubblicazioni tolti anche fra portali (stesso identificativo, oppure stesso indirizzo con metri
            e prezzo vicini), con i casi dubbi elencati per una rilettura a mano; modello congelato con un&apos;impronta prima di guardare i
            dati; nessun coefficiente scelto sul campione di verifica; rapporto con dimensione, copertura, date e metriche. Quando esisterà
            un rapporto, i suoi numeri sostituiranno qui quelli di taratura.
          </p>

          <h2 id="limiti">Che cosa la stima non sa</h2>
          <p>
            Non conosce la vista, il piano nobile, il palazzo, il condominio, i vincoli, le spese straordinarie in arrivo. Non ha un
            trattamento validato per i piani sotto il livello stradale: per il seminterrato non dà una valutazione, solo una simulazione
            esplicita che ipotizza un piano terra. I valori predefiniti sono ipotesi: li mostriamo accanto al risultato, senza chiedere conferme aggiuntive. Puoi modificarli nel modulo. È una stima automatica indicativa, non una perizia.
          </p>

          <p style={{ marginTop: "var(--s-8)" }}>
            <Link className="v-btn v-btn--accent" href="/valuta">Valuta una casa</Link>
          </p>
        </article>
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
