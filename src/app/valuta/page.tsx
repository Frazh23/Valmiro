"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "@/components/sistema/Header";
import AddressSearch from "@/components/sistema/AddressSearch";
import ValuationReveal from "@/components/sistema/ValuationReveal";
import NumeroAnimato from "@/components/sistema/NumeroAnimato";
import MarketRange from "@/components/sistema/MarketRange";
import FactorExplanation from "@/components/sistema/FactorExplanation";
import RenovationSelector from "@/components/sistema/RenovationSelector";
import Reveal from "@/components/sistema/Reveal";
/* La mappa porta con se' i perimetri semplificati delle 42 zone: 70 KB di dati
   che finivano nel primo caricamento di /valuta anche se la mappa sta dentro un
   pannello chiuso. Ora il modulo arriva solo se qualcuno apre quel pannello. */
const Mappa = dynamic(() => import("@/components/Mappa"), {
  ssr: false,
  loading: () => <p className="v-small">Carico la mappa…</p>,
});
import { eur, num } from "@/lib/formato";
import { ZONE, FONTE, FASCIA_NOME, INDICE_ISTAT } from "@/lib/data";
import { scala, PIANO_NON_VALUTABILE } from "@/lib/engine";
import { CATEGORIE, tipoDaCategoria, type Categoria } from "@/lib/catasto";
import { rendita, andamento } from "@/lib/affitto";
import { leggiAnnuncio, type Letto } from "@/lib/annuncio";
import { INPUT_INIZIALE, applicaLettura, type ModoImport } from "@/lib/modulo";
import { NOME_CAMPO, MATERIALI, ipotesiDi, ipotesiMateriali, valoreInParole, descriviIpotesi, DATI_NON_CONFERMATI, type Campo } from "@/lib/provenienza";
import { LAVORI_INIZIALI, type SceltaLavori } from "@/lib/ristrutturazione";
import AskingPrice from "@/components/sistema/AskingPrice";
import RentalYield from "@/components/sistema/RentalYield";
import ZoneHistory from "@/components/sistema/ZoneHistory";
import ShortRent from "@/components/sistema/ShortRent";
import { salvaStima, salvaStimaAccount } from "@/lib/storage";
import { useSessione } from "@/lib/sessione";
import { FONTI, PIANI_NON_QUOTATI, type FonteIndirizzo, type Input, type Intento, type PianoNonQuotato, type Scelta, type Stato, type Stima, type Tipo } from "@/lib/types";


const STATI: { id: Stato; t: string; d: string }[] = [
  { id: "rist", t: "Da ristrutturare", d: "Impianti e finiture da rifare" },
  { id: "abit", t: "Abitabile", d: "Si entra così, finiture datate" },
  { id: "otti", t: "Ottimo stato", d: "Ristrutturata negli ultimi dieci anni" },
  { id: "nuov", t: "Nuova", d: "Mai abitata o appena consegnata" },
];
const TIPI: { id: Tipo; t: string }[] = [
  { id: "civ", t: "Appartamento" }, { id: "sig", t: "Signorile" },
  { id: "eco", t: "Economico" }, { id: "vil", t: "Villa" },
];
const PIANI = ["terra", "rialzato", "1-2", "3-5", "6+", "ultimo"] as const;
const CLASSI = ["A", "B", "C", "D", "E", "F", "G"] as const;

/* Le parole cambiano con l'intento. Il valore no: la stessa casa, con gli stessi
   dati, vale lo stesso nei due percorsi, e il motore non sa nemmeno quale sia. */
const TESTI = {
  compro: {
    dove: "Quale casa stai valutando?",
    doveLead: "Incolla il testo dell'annuncio e leggiamo noi indirizzo, metri, piano e prezzo. Oppure scrivi via e civico.",
    prezzo: "Prezzo richiesto nell'annuncio",
    prezzoHint: "Facoltativo. Lo confrontiamo con il valore stimato e ti diciamo dove sta.",
    confronto: "È caro o no?",
  },
  vendo: {
    dove: "Quale casa vuoi vendere?",
    doveLead: "Via e civico. Milano è divisa in 42 zone omogenee: è lì che si formano i prezzi.",
    prezzo: "Prezzo a cui pensavi di metterla in vendita",
    prezzoHint: "Facoltativo. Lo confrontiamo con il valore stimato e con il prezzo a cui case simili vengono messe in vendita.",
    confronto: "Valore stimato e prezzo di pubblicazione",
  },
} as const;

/** Cosa succede alla stima con quella categoria, detto in una riga. */
function tipologiaNota(c: Categoria, tipo: Tipo, zona: Record<string, any>) {
  const cat = CATEGORIE.find((x) => x.id === c);
  const nome = TIPI.find((t) => t.id === tipo)?.t.toLowerCase();
  if (!cat) return "";
  const quotata = zona[tipo] && Object.keys(zona[tipo]).length > 0;
  if (!quotata) return `${cat.nome}: tipologia «${nome}», che in questa zona l'OMI non quota. Usiamo le quotazioni civili.`;
  const nota = cat.nota.charAt(0).toUpperCase() + cat.nota.slice(1);
  return `${cat.nome}: usiamo le quotazioni OMI «${nome}» della zona. ${nota}.`;
}

/** Un numero dal modulo, com'e': i negativi restano tali per essere segnalati, non azzerati in silenzio. */
const numero = (v: string) => (v === "" ? 0 : Number(v));

type Esito = { stima: Stima };

export default function Pagina() {
  return (
    <Suspense fallback={<div className="v-page"><Header /></div>}>
      <Valuta />
    </Suspense>
  );
}

function Valuta() {
  const params = useSearchParams();
  const { utente } = useSessione();

  const [vista, setVista] = useState<"intento" | "dove" | "casa" | "calcolo" | "risultato">("intento");
  const [indirizzo, setIndirizzo] = useState("");
  const [fonte, setFonte] = useState<FonteIndirizzo>("dizionario");
  const [avviso, setAvviso] = useState<string | null>(null);
  const [primaCasa, setPrimaCasa] = useState(true);
  const [esito, setEsito] = useState<Esito | null>(null);
  /* l'ultimo modulo salvato, serializzato: ogni valutazione con dati diversi e' una stima nuova
     (una simulazione e la stima confermata che la segue sono due record, com'e' giusto) */
  const [ultimoSalvato, setUltimoSalvato] = useState<string | null>(null);
  const [mappaAperta, setMappaAperta] = useState(false);
  const [testoAnnuncio, setTestoAnnuncio] = useState("");
  const [letto, setLetto] = useState<Letto | null>(null);
  const [annuncioNota, setAnnuncioNota] = useState<string | null>(null);
  const [qIniziale, setQIniziale] = useState("");
  /* cose lette dall'annuncio che il modulo non rappresenta e va detto */
  const [avvisiAnnuncio, setAvvisiAnnuncio] = useState<string[]>([]);
  /* in aggiornamento: che cosa e' cambiato rispetto a prima, in parole */
  const [modifiche, setModifiche] = useState<string[] | null>(null);
  /* pacchetto e personalizzazioni della ristrutturazione: appartengono all'immobile */
  const [lavori, setLavori] = useState<SceltaLavori>(LAVORI_INIZIALI);

  const [i, setI] = useState<Input>(INPUT_INIZIALE);
  const set = (p: Partial<Input>) => setI((v) => ({ ...v, ...p }));
  /* La provenienza di ogni campo vive nel modulo (Input.provenienza): cambiare o confermare un
     valore lo rende «utente»; «non lo so» lo rende «sconosciuto», che per il calcolo resta
     un'ipotesi dichiarata. Un predefinito non confermato e' «ipotesi» e non diventa un fatto. */
  const segna = (c: Campo, p: "utente" | "sconosciuto") => setI((v) => {
    const n: Input = { ...v, provenienza: { ...v.provenienza, [c]: p } };
    /* quando non restano ipotesi materiali, la richiesta di simulazione non ha piu' oggetto */
    if (!ipotesiMateriali(n).length) n.simulazioneDati = false;
    return n;
  });
  const tocca = (c: Campo) => segna(c, "utente");
  const prov = (c: Campo) => i.provenienza?.[c];
  const daConfermare = (Object.keys(NOME_CAMPO) as Campo[]).filter((c) => prov(c) === "ipotesi" || prov(c) === "sconosciuto");
  /* Sotto ogni campo non confermato: lo stato del dato e i due gesti espliciti. Riselezionare
     un'opzione gia' attiva conferma anch'esso, ma il bottone toglie l'ambiguita'. */
  const conferma = (c: Campo) => {
    const p = prov(c);
    if (p !== "ipotesi" && p !== "sconosciuto") return null;
    if (c === "mq" && !(i.mq > 0)) return null; /* senza metri il messaggio e' un altro: «manca la superficie» */
    const materiale = MATERIALI.includes(c);
    return (
      <div className="v-conferma" role="group" aria-label={`Stato del dato: ${NOME_CAMPO[c]}`}>
        <span className={"v-field__hint" + (p === "ipotesi" ? " v-field__hint--conferma" : "")}>
          {p === "ipotesi"
            ? <>{letto ? "Non dichiarato nell'annuncio" : "Non ancora confermato"}: «{valoreInParole(i, c)}» è il valore predefinito, non un dato{materiale ? " — senza conferma non c'è valutazione" : ""}.</>
            : <>Non lo sai: il calcolo userà «{valoreInParole(i, c)}» come ipotesi dichiarata, e lo scriverà accanto al numero.</>}
        </span>
        <span className="v-conferma__azioni">
          <button type="button" className="v-btn v-btn--quiet v-btn--xs" onClick={() => tocca(c)}>Confermo questo valore</button>
          {p === "ipotesi" && <button type="button" className="v-btn v-btn--bare v-btn--xs" onClick={() => segna(c, "sconosciuto")}>Non lo so</button>}
        </span>
      </div>
    );
  };
  const boxSeparato = i.boxSeparato ?? null;
  const zona = i.zona ? ZONE[i.zona] : null;
  const intento: Intento | undefined = i.intento;
  const T = TESTI[intento || "vendo"];

  /* Indirizzo e intento arrivano dalla home nell'URL: la valutazione e' ricaricabile.
     Chi entra senza intento lo sceglie qui, prima di tutto il resto. */
  useEffect(() => {
    const it = params.get("i");
    const conIntento = it === "compro" || it === "vendo";
    if (conIntento) setI((v) => ({ ...v, intento: it }));
    const z = params.get("zona");
    if (z && ZONE[z]) {
      setI((v) => ({ ...v, zona: z }));
      setIndirizzo(params.get("ind") || ZONE[z].d);
      const f = params.get("f");
      /* L'elenco delle fonti valide sta in types.ts: qui si legge da li', non
         si ripete a mano, altrimenti ogni fonte nuova torna "dizionario". */
      setFonte(FONTI.includes(f as FonteIndirizzo) ? (f as FonteIndirizzo) : "dizionario");
      setVista(conIntento ? "casa" : "intento");
    } else setVista(conIntento ? "dove" : "intento");
  }, [params]);

  /* Cambiare intento non cancella niente: indirizzo e caratteristiche restano. */
  function scegliIntento(it: Intento) {
    set({ intento: it });
    if (vista === "intento") setVista(i.zona ? "casa" : "dove");
  }

  function scegliIndirizzo(s: Scelta) {
    set({ zona: s.zona }); setIndirizzo(s.etichetta); setFonte(s.fonte);
    setAvviso(null); setVista("casa");
  }

  /* Il testo incollato viene letto qui, nel browser: non parte verso nessun
     server. Solo l'indirizzo, se c'e', va a /api/geocode come farebbe la ricerca. */
  /* C'e' gia' un immobile nel modulo? Allora un nuovo testo puo' essere un'altra casa
     o la stessa riletta: lo decide chi legge, con due bottoni diversi. L'indirizzo non
     basta a dirlo: due case allo stesso civico sono due case. */
  const haImmobile = i.mq > 0 || letto !== null || esito !== null;

  async function leggiTesto(modo: ModoImport) {
    const r = leggiAnnuncio(testoAnnuncio);
    if (!r.trovati.length) { setAnnuncioNota("Nel testo non ho riconosciuto né metri, né prezzo, né indirizzo. Prova a incollare tutta la scheda dell'annuncio, non solo il titolo."); return; }
    const a = applicaLettura(i, r, modo);
    setI(a.input);
    setLetto(r);
    setAvvisiAnnuncio(a.avvisi);
    setModifiche(modo === "aggiorna" ? a.modifiche : null);
    setAnnuncioNota(null);
    setAvviso(null);
    setUltimoSalvato(null);
    setEsito(null);
    if (modo === "nuovo") {
      /* un altro immobile: niente di quello di prima sopravvive, nemmeno indirizzo, avvisi e scelte sui lavori */
      setIndirizzo(""); setFonte("dizionario"); setQIniziale("");
      setLavori(LAVORI_INIZIALI); setPrimaCasa(true);
    }
    if (!r.indirizzo) {
      if (modo === "aggiorna" && i.zona) { setVista("casa"); return; }
      setAnnuncioNota("Ho letto i dati della casa ma non l'indirizzo: cercalo qui sopra e i dati restano.");
      return;
    }
    try {
      const g = await fetch(`/api/geocode?q=${encodeURIComponent(r.indirizzo)}`).then((x) => x.json());
      const c = g?.candidati?.[0];
      if (g?.trovato && c?.zona && ZONE[c.zona]) {
        scegliIndirizzo({ zona: c.zona, etichetta: c.etichetta, descrizione: c.descrizione, fonte: c.fonte, preciso: !!c.preciso });
        return;
      }
    } catch {}
    setQIniziale(r.indirizzo);
    setAnnuncioNota(`Ho letto «${r.indirizzo}» ma non l'ho trovato in anagrafe: correggilo qui sopra e i dati restano.`);
  }

  /* I bottoni del testo incollato: uno solo se il modulo e' vuoto, due se c'e' gia' una casa. */
  const bottoniLettura = (
    <div className="v-actions">
      {haImmobile ? (
        <>
          <button className="v-btn" disabled={testoAnnuncio.trim().length < 20} onClick={() => leggiTesto("nuovo")}>Importa un nuovo immobile</button>
          <button className="v-btn v-btn--quiet" disabled={testoAnnuncio.trim().length < 20} onClick={() => leggiTesto("aggiorna")}>Aggiorna questo immobile</button>
        </>
      ) : (
        <button className="v-btn" disabled={testoAnnuncio.trim().length < 20} onClick={() => leggiTesto("nuovo")}>Leggi l&apos;annuncio</button>
      )}
    </div>
  );
  const notaLettura = haImmobile ? (
    <p className="v-small">
      <b>Nuovo immobile</b>: il modulo riparte da zero e ciò che il testo non dice resta da confermare.
      <b> Aggiorna</b>: cambia solo ciò che il testo dichiara, e ti mostro cosa è cambiato.
    </p>
  ) : null;

  /* La stima passa dalla rotta: e' il contratto pubblico del motore. I prospetti di
     ristrutturazione si calcolano nel browser, perche' cambiano a ogni scelta. */
  const calcola = useCallback(async (): Promise<Esito> => {
    const r = await fetch("/api/estimate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i),
    }).then((x) => x.json());
    if (r.errore) throw new Error(r.errore);
    return { stima: r.stima };
  }, [i]);

  function fatto(e: Esito) {
    setEsito(e); setVista("risultato");
    const impronta = JSON.stringify(i);
    if (impronta !== ultimoSalvato && zona) {
      const da = {
        indirizzo: indirizzo || `Zona ${i.zona}`, zona: i.zona, descrizioneZona: zona.d,
        input: i, stima: e.stima, prezzoEsposto: i.prezzoRichiesto || undefined,
      };
      if (utente) salvaStimaAccount(utente.id, da); else salvaStima(da);
      setUltimoSalvato(impronta);
    }
  }

  /* Una sola frase di mercato, costruita sui numeri gia' calcolati. */
  const insight = useMemo(() => {
    /* in una simulazione di piano non si giudica la posizione nella zona: il piano vero non e' quotato */
    if (!esito || !i.zona || esito.stima.simulazione || esito.stima.ipotesi?.length) return null;
    const s = scala(i.zona, i.tipo);
    const mediana = s.mediaN * INDICE_ISTAT;
    const scarto = (esito.stima.euroMq - mediana) / mediana;
    const f = ZONE[i.zona].f;
    if (Math.abs(scarto) < 0.04)
      return <>È <b>in linea con il punto medio dell&apos;intervallo OMI</b> della zona: {eur(mediana)} €/mq per un immobile in stato normale.</>;
    return scarto > 0
      ? <>Vale <b>il {num(scarto * 100)}% in più</b> del punto medio dell&apos;intervallo OMI di zona ({eur(mediana)} €/mq, stato normale): sono piano, stato e caratteristiche a spingerla verso l&apos;alto della forbice {FASCIA_NOME[f]?.toLowerCase()}.</>
      : <>Vale <b>il {num(Math.abs(scarto) * 100)}% in meno</b> del punto medio dell&apos;intervallo OMI di zona ({eur(mediana)} €/mq, stato normale): è lo spazio che una ristrutturazione può recuperare.</>;
  }, [esito, i.zona, i.tipo]);

  const pertinenzeDaChiedere = i.superficie === "calpestabile" || i.pertinenzeIncluse === false;

  /* Errori del modulo, detti accanto al campo e ripetuti sul bottone: niente correzioni in silenzio. */
  const errori = {
    mq: i.mq < 0 ? "La superficie non può essere negativa." : null,
    mqBalconi: (i.mqBalconi ?? 0) < 0 ? "I metri dei balconi non possono essere negativi." : null,
    mqTerrazzi: (i.mqTerrazzi ?? 0) < 0 ? "I metri dei terrazzi non possono essere negativi." : null,
    prezzo: (i.prezzoRichiesto ?? 0) < 0 ? "Il prezzo non può essere negativo." : null,
    prezzoBox: (i.boxSeparato?.prezzo ?? 0) < 0 ? "Il prezzo del box non può essere negativo." : null,
  };
  const erroriAttivi = Object.values(errori).filter(Boolean) as string[];

  /* Il box a parte entra nella valutazione o no. Il suo prezzo resta nel suo campo: non si
     somma mai a quello dell'abitazione, e' il confronto a decidere cosa mettere contro cosa. */
  function includiBox(incluso: boolean) {
    if (!boxSeparato) return;
    set({ box: incluso ? "box" : "nessuno", boxSeparato: { ...boxSeparato, incluso } });
    tocca("box");
  }
  /* Il piano dal menu: uno quotato, oppure uno che il modello non quota, che resta scritto. */
  function scegliPiano(v: string) {
    tocca("piano");
    if ((PIANI_NON_QUOTATI as readonly string[]).includes(v)) set({ pianoDichiarato: v as PianoNonQuotato, piano: "terra", simulazionePiano: false });
    else set({ piano: v as Input["piano"], pianoDichiarato: null, simulazionePiano: false });
  }
  const pianoBloccato = !!i.pianoDichiarato && !i.simulazionePiano;

  /* Il bottone per cambiare intento, sempre a portata: cambia le parole, non i dati. */
  const switchIntento = intento && (
    <span className="v-locus v-locus--intento" role="group" aria-label="Cosa vuoi fare">
      <button className={intento === "compro" ? "on" : ""} onClick={() => scegliIntento("compro")}>Voglio comprare</button>
      <button className={intento === "vendo" ? "on" : ""} onClick={() => scegliIntento("vendo")}>Voglio vendere</button>
    </span>
  );

  return (
    <div className="v-page">
      <Header />

      {vista === "calcolo" && (
        <ValuationReveal
          indirizzo={indirizzo}
          lavoro={calcola}
          onFatto={fatto}
          onErrore={(m) => { setAvviso(m); setVista("casa"); }}
        />
      )}

      <main className="v-fill">
        {/* ---------------------------------------------------- INTENTO */}
        {vista === "intento" && (
          <section className="v-wrap v-section">
            <div className="v-form">
              <div className="v-form__head">
                <p className="v-eyebrow">Prima di tutto</p>
                <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Quanto vale questa casa?</h1>
                <p className="v-lead" style={{ marginTop: "var(--s-4)", maxWidth: "40ch" }}>
                  Una stima per decidere meglio. Dicci da che parte stai: il valore è lo stesso, cambiano le domande.
                </p>
              </div>
              <div className="v-choices">
                <button className="v-choice v-choice--lg" onClick={() => scegliIntento("compro")}>
                  <b>Voglio comprare</b><small>Sto guardando una casa in vendita: è cara? Quanto offrire? Cosa costerebbe sistemarla?</small>
                </button>
                <button className="v-choice v-choice--lg" onClick={() => scegliIntento("vendo")}>
                  <b>Voglio vendere</b><small>Quanto vale la mia casa, a che prezzo pubblicarla, conviene sistemarla prima?</small>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------- DOVE */}
        {vista === "dove" && intento && (
          <section className="v-wrap v-section">
            <div className="v-form">
              <div className="v-form__head">
                <p className="v-eyebrow">Passo uno</p>
                <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>{T.dove}</h1>
                <p className="v-lead" style={{ marginTop: "var(--s-4)", maxWidth: "44ch" }}>{T.doveLead}</p>
                <div style={{ marginTop: "var(--s-4)" }}>{switchIntento}</div>
              </div>

              {intento === "compro" && (
                <div className="v-incolla">
                  <span className="v-field__lbl">Il testo dell&apos;annuncio</span>
                  <textarea className="v-input v-textarea" rows={6} value={testoAnnuncio}
                            onChange={(e) => setTestoAnnuncio(e.target.value)}
                            placeholder="Trilocale in via Savona 35, 85 m², 2° piano con ascensore, buono stato, classe D, balcone 6 m², € 450.000…" />
                  {bottoniLettura}
                  {notaLettura}
                  <p className="v-small">
                    Lo leggiamo qui nel tuo browser, non lo inviamo a nessuno. I link non li apriamo: i portali non permettono la lettura automatica.
                  </p>
                  {annuncioNota && <p className="v-note">{annuncioNota}</p>}
                  <p className="v-field__lbl" style={{ marginTop: "var(--s-5)" }}>Oppure scrivi l&apos;indirizzo</p>
                </div>
              )}

              <AddressSearch key={qIniziale} onScegli={scegliIndirizzo} azione="Continua" autoFocus={intento === "vendo"} valoreIniziale={qIniziale} />

              {intento === "vendo" && (
                <details className="v-more" style={{ marginTop: "var(--s-7)" }}>
                  <summary>Hai un annuncio della casa? Incolla il testo</summary>
                  <div className="v-more__in">
                    <p className="v-small">
                      Copia la scheda, tutta: indirizzo, metri, piano, stato, classe. La leggiamo qui nel tuo browser, non la inviamo a nessuno.
                    </p>
                    <textarea className="v-input v-textarea" rows={6} value={testoAnnuncio}
                              onChange={(e) => setTestoAnnuncio(e.target.value)} />
                    {bottoniLettura}
                    {notaLettura}
                    {annuncioNota && <p className="v-note">{annuncioNota}</p>}
                  </div>
                </details>
              )}

              <details
                className="v-more" style={{ marginTop: "var(--s-5)" }}
                onToggle={(e) => setMappaAperta((e.currentTarget as HTMLDetailsElement).open)}
              >
                <summary>Non trovi l&apos;indirizzo? Indica il punto sulla mappa</summary>
                <div className="v-more__in">
                  {mappaAperta && (
                    <Mappa
                      zona={i.zona || null}
                      onPick={(z) => { set({ zona: z }); setIndirizzo(ZONE[z].d); setFonte("civico"); setVista("casa"); }}
                    />
                  )}
                </div>
              </details>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------- LA CASA */}
        {vista === "casa" && zona && intento && (
          <section className="v-wrap v-section">
            <div className="v-form">
              <div className="v-form__head">
                <p className="v-eyebrow">Passo due</p>
                <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Raccontaci la casa</h1>
                <div className="v-loci">
                  <span className="v-locus">
                    <span><b>{indirizzo}</b> · zona {i.zona}, {zona.d}</span>
                    <button onClick={() => setVista("dove")}>Cambia</button>
                  </span>
                  {switchIntento}
                </div>
                {fonte === "via" && (
                  <p className="v-small" style={{ marginTop: "var(--s-3)" }}>
                    Zona presa dalla via, non dal numero civico. Per quasi tutte le vie di Milano
                    è la stessa cosa; per le poche che attraversano più zone OMI il civico sposta la
                    stima, quindi conviene aggiungerlo o controllare il punto sulla mappa.
                  </p>
                )}
                {fonte === "dizionario" && (
                  <p className="v-small" style={{ marginTop: "var(--s-3)" }}>
                    Zona dedotta dal nome del quartiere, non da coordinate. Se non è quella giusta,
                    cambia indirizzo o indica il punto sulla mappa.
                  </p>
                )}
                {letto && (
                  <p className="v-note" style={{ marginTop: "var(--s-4)" }}>
                    Dall&apos;annuncio ho letto: {letto.trovati.join(", ")}. Sono già nel modulo: controllali,
                    un annuncio dice «ristrutturato» più spesso di quanto lo sia.
                    {avvisiAnnuncio.length ? ` Attenzione: ${avvisiAnnuncio.join("; ")}.` : ""}
                    {letto.balconi && !letto.mqBalconi && letto.terrazzo && !letto.mqTerrazzi
                      ? " I metri di balconi e terrazzo non erano scritti: se li conosci e non sono già nella superficie, inseriscili qui sotto."
                      : letto.balconi && !letto.mqBalconi
                      ? " I metri dei balconi non erano scritti: se li conosci e non sono già nella superficie, inseriscili qui sotto."
                      : letto.terrazzo && !letto.mqTerrazzi
                      ? " I metri del terrazzo non erano scritti: se li conosci e non sono già nella superficie, inseriscili qui sotto."
                      : ""}
                    {daConfermare.length > 0 && (
                      <> <b>Non dice</b>: {daConfermare.map((c) => NOME_CAMPO[c]).join(", ")}{letto.classe ? "" : ", classe energetica"}. Nel modulo stanno ai valori
                      predefiniti, che non sono dati della casa: confermali, correggili o segna «non lo so», campo per campo.</>
                    )}
                  </p>
                )}
                {modifiche !== null && (
                  <p className="v-note" style={{ marginTop: "var(--s-3)" }}>
                    <b>Immobile aggiornato.</b>{" "}
                    {modifiche.length ? <>Cambiano: {modifiche.join("; ")}. Il resto è rimasto com&apos;era.</> : "Il testo non cambia nessun dato: il modulo è rimasto com'era."}
                  </p>
                )}
              </div>

              <div className="v-fields">
                <div className="v-field">
                  <span className="v-field__lbl">Superficie</span>
                  <div className="v-row2">
                    <input className={"v-input" + (errori.mq ? " v-input--errore" : "")} type="number" inputMode="numeric" min={0} placeholder="93"
                           aria-invalid={!!errori.mq}
                           value={i.mq || ""} onChange={(e) => { tocca("mq"); set({ mq: numero(e.target.value) }); }} />
                    <select className="v-select" value={i.superficie || "commerciale"}
                            onChange={(e) => set({ superficie: e.target.value as Input["superficie"] })}>
                      <option value="commerciale">metri commerciali</option>
                      <option value="calpestabile">metri calpestabili</option>
                    </select>
                  </div>
                  {errori.mq && <span className="v-field__hint v-field__hint--errore" role="alert">{errori.mq}</span>}
                  {conferma("mq")}
                  <span className="v-field__hint">
                    {i.superficie === "calpestabile"
                      ? "La calpestabile è la superficie interna, senza muri. L'OMI ragiona in commerciale, muri compresi: aggiungiamo il 12%, che è una media, e le pertinenze qui sotto."
                      : "La commerciale è quella degli annunci e degli atti: comprende i muri e, di solito, balconi e cantina a quota ridotta."}
                  </span>
                </div>

                {i.superficie !== "calpestabile" && (
                  <label className="v-toggle">
                    <span>Balconi, terrazzi e cantina sono già compresi in questi metri<small>Negli annunci quasi sempre sì. Se togli la spunta, li aggiungiamo noi dai campi qui sotto.</small></span>
                    <input type="checkbox" checked={i.pertinenzeIncluse !== false}
                           onChange={(e) => { tocca("pertinenze"); set({ pertinenzeIncluse: e.target.checked }); }} />
                  </label>
                )}
                {conferma("pertinenze")}

                {pertinenzeDaChiedere && (
                  <>
                    <div className="v-row2">
                      <label className="v-field">
                        <span className="v-field__lbl">Balconi, m²</span>
                        <input className={"v-input" + (errori.mqBalconi ? " v-input--errore" : "")} type="number" inputMode="decimal" min={0} step="0.5" placeholder="0"
                               aria-invalid={!!errori.mqBalconi}
                               value={i.mqBalconi || ""} onChange={(e) => { tocca("pertinenze"); set({ mqBalconi: numero(e.target.value) }); }} />
                        {errori.mqBalconi && <span className="v-field__hint v-field__hint--errore" role="alert">{errori.mqBalconi}</span>}
                        <span className="v-field__hint">Sporgono dalla facciata, di solito stretti: si sta in piedi, non a tavola.</span>
                      </label>
                      <label className="v-field">
                        <span className="v-field__lbl">Terrazzi, m²</span>
                        <input className={"v-input" + (errori.mqTerrazzi ? " v-input--errore" : "")} type="number" inputMode="decimal" min={0} step="0.5" placeholder="0"
                               aria-invalid={!!errori.mqTerrazzi}
                               value={i.mqTerrazzi || ""} onChange={(e) => { tocca("pertinenze"); set({ mqTerrazzi: numero(e.target.value) }); }} />
                        {errori.mqTerrazzi && <span className="v-field__hint v-field__hint--errore" role="alert">{errori.mqTerrazzi}</span>}
                        <span className="v-field__hint">Sopra un altro locale o in arretramento, abbastanza larghi da viverci.</span>
                      </label>
                    </div>
                    <p className="v-small v-measure">
                      Contano al 30% fino a 25 m² complessivi e al 10% oltre, come nel DPR 138/1998: la regola non distingue il balcone
                      dal terrazzo, li pesa insieme per la loro superficie. Li chiediamo separati per chiarezza e per il futuro.
                    </p>
                    <label className="v-toggle">
                      <span>Cantina o soffitta<small>Aggiunge 2,5 m² commerciali: il 25% di una cantina da 10 m², come nel DPR 138/1998</small></span>
                      <input type="checkbox" checked={!!i.cantina} onChange={(e) => { tocca("pertinenze"); set({ cantina: e.target.checked }); }} />
                    </label>
                  </>
                )}

                <div className="v-field">
                  <span className="v-field__lbl">In che stato è</span>
                  <div className="v-choices">
                    {STATI.map((s) => (
                      <button key={s.id} className="v-choice" aria-pressed={i.stato === s.id}
                              onClick={() => { tocca("stato"); set({ stato: s.id }); }}>
                        <b>{s.t}</b><small>{s.d}</small>
                      </button>
                    ))}
                  </div>
                  {conferma("stato")}
                </div>

                <div className="v-row2">
                  <label className="v-field">
                    <span className="v-field__lbl">Piano</span>
                    <select className={"v-select" + (pianoBloccato ? " v-input--errore" : "")} value={i.pianoDichiarato ?? i.piano}
                            aria-invalid={pianoBloccato}
                            onChange={(e) => scegliPiano(e.target.value)}>
                      {PIANI.map((p) => <option key={p} value={p}>{p}</option>)}
                      <optgroup label="Non quotati dal modello">
                        {PIANI_NON_QUOTATI.map((p) => <option key={p} value={p}>{p}</option>)}
                      </optgroup>
                    </select>
                    {conferma("piano")}
                  </label>
                  <label className="v-field">
                    <span className="v-field__lbl">Classe energetica</span>
                    <select className="v-select" value={i.classe}
                            onChange={(e) => { tocca("classe"); set({ classe: e.target.value as Input["classe"] }); }}>
                      <option value="nd">Non la conosco</option>
                      {CLASSI.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {i.classe === "nd" && <span className="v-field__hint">Senza classe la stima non applica nessun aggiustamento, e lo scrive nel dettaglio. Una classe vera la sposta fino al ±10%.</span>}
                    {conferma("classe")}
                  </label>
                </div>

                {i.pianoDichiarato && (
                  <div className={"v-note" + (pianoBloccato ? " v-note--errore" : "")} role={pianoBloccato ? "alert" : undefined}>
                    <p style={{ margin: 0 }}>
                      <b>Piano {i.pianoDichiarato}: non è disponibile una valutazione attendibile.</b> Il modello attuale non dispone
                      di un trattamento validato per questo piano. Il piano dichiarato resta scritto qui e nella stima salvata.
                    </p>
                    <label className="v-toggle" style={{ marginTop: "var(--s-3)" }}>
                      <span>Simulazione che ipotizza un piano terra<small>Uno scenario, non una valutazione del {i.pianoDichiarato}: il piano terra vale di più, ma di quanto il modello non lo sa. Il risultato lo dice in ogni pagina e non giudica se il prezzo è caro o conveniente.</small></span>
                      <input type="checkbox" checked={!!i.simulazionePiano} onChange={(e) => set({ simulazionePiano: e.target.checked })} />
                    </label>
                  </div>
                )}

                <label className="v-toggle">
                  <span>Ascensore<small>Dal terzo piano in su pesa molto</small></span>
                  <input type="checkbox" checked={i.ascensore}
                         onChange={(e) => { tocca("ascensore"); set({ ascensore: e.target.checked }); }} />
                </label>
                {conferma("ascensore")}

                {/* La categoria catastale decide la tipologia OMI, che in centro vale un
                    quinto del prezzo. Sta sulla visura e sul rogito: chi possiede la casa
                    la ha. Chi non la sa resta su "civile", la piu' comune. */}
                <label className="v-field">
                  <span className="v-field__lbl">Categoria catastale</span>
                  <select className="v-select" value={i.categoria || ""}
                          onChange={(e) => {
                            const c = (e.target.value || null) as Categoria | null;
                            const t = tipoDaCategoria(c);
                            set({ categoria: c, ...(t ? { tipo: t } : {}) });
                          }}>
                    <option value="">Non la so — uso «civile», la più comune</option>
                    {CATEGORIE.map((c) => (
                      <option key={c.id} value={c.id}>{c.id} · {c.nome}</option>
                    ))}
                  </select>
                  <span className="v-field__hint">
                    {i.categoria
                      ? tipologiaNota(i.categoria as Categoria, i.tipo, zona)
                      : "È scritta sulla visura catastale e nel rogito, alla voce «Categoria». Sposta la stima anche del 20%."}
                  </span>
                </label>

                <div className="v-field">
                  <span className="v-field__lbl">Tipologia OMI in zona {i.zona}</span>
                  <span className="v-field__hint">Derivata dalla categoria catastale; se la cambi a mano, la categoria viene azzerata.</span>
                  <div className="v-choices v-choices--4">
                    {TIPI.map((t) => {
                      const ok = zona[t.id] && Object.keys(zona[t.id]).length > 0;
                      return (
                        <button key={t.id} className="v-choice" aria-pressed={i.tipo === t.id}
                                disabled={!ok} onClick={() => set({ tipo: t.id, categoria: null })}>
                          <b>{t.t}</b><small>{ok ? "quotata" : "non quotata qui"}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="v-field">
                  <span className="v-field__lbl">Luminosità</span>
                  <select className="v-select" value={i.luce}
                          onChange={(e) => set({ luce: e.target.value as Input["luce"] })}>
                    <option value="scarsa">scarsa</option>
                    <option value="media">media</option>
                    <option value="ottima">ottima</option>
                  </select>
                </label>

                {!pertinenzeDaChiedere && (
                  <label className="v-toggle">
                    <span>Cantina o soffitta<small>Se è già dentro i metri commerciali non la contiamo di nuovo: qui serve solo alla descrizione</small></span>
                    <input type="checkbox" checked={!!i.cantina} onChange={(e) => { tocca("pertinenze"); set({ cantina: e.target.checked }); }} />
                  </label>
                )}

                {boxSeparato && (
                  <>
                    <label className="v-toggle">
                      <span>
                        L&apos;annuncio offre un box a parte{boxSeparato.prezzo ? `, a ${eur(boxSeparato.prezzo)} €` : ", senza dirne il prezzo"}: includilo nella valutazione
                        <small>
                          Se lo includi, il box entra nel valore stimato con il suo valore, tenuto separato da quello dell&apos;abitazione.
                          Il prezzo dell&apos;abitazione e quello del box restano due cifre distinte: il confronto mette ciascuna contro il proprio valore.
                          Se non lo includi, valutiamo la sola abitazione, come il prezzo dell&apos;annuncio.
                        </small>
                      </span>
                      <input type="checkbox" checked={boxSeparato.incluso} onChange={(e) => includiBox(e.target.checked)} />
                    </label>
                    {boxSeparato.incluso && (
                      <label className="v-field">
                        <span className="v-field__lbl">Prezzo richiesto per il box</span>
                        <input className={"v-input" + (errori.prezzoBox ? " v-input--errore" : "")} type="number" inputMode="numeric" min={0} placeholder="—"
                               aria-invalid={!!errori.prezzoBox}
                               value={boxSeparato.prezzo || ""}
                               onChange={(e) => set({ boxSeparato: { ...boxSeparato, prezzo: e.target.value === "" ? null : numero(e.target.value) } })} />
                        {errori.prezzoBox && <span className="v-field__hint v-field__hint--errore" role="alert">{errori.prezzoBox}</span>}
                        <span className="v-field__hint">
                          {boxSeparato.prezzo
                            ? "Letto dall'annuncio o inserito da te: con questo il confronto vale anche sul totale abitazione più box."
                            : "L'annuncio non lo scrive. Senza, il confronto è sulla sola abitazione e il totale resta non confrontabile: il valore stimato del box non fa da prezzo."}
                        </span>
                      </label>
                    )}
                  </>
                )}
                <div className="v-field">
                  <span className="v-field__lbl">
                    Posto auto{zona.box ? ` · box quotato ${eur(zona.box[0])}–${eur(zona.box[1])} €/mq` : ""}
                  </span>
                  <div className="v-choices v-choices--4">
                    {([["nessuno", "Nessuno"], ["posto", "Posto auto"], ["box", "Box"]] as const).map(([id, t]) => (
                      <button key={id} className="v-choice" aria-pressed={i.box === id}
                              onClick={() => { tocca("box"); set({ box: id, ...(boxSeparato ? { boxSeparato: { ...boxSeparato, incluso: id === "box" } } : {}) }); }}>
                        <b>{t}</b>
                      </button>
                    ))}
                  </div>
                  {conferma("box")}
                </div>

                <div className="v-field">
                  <span className="v-field__lbl">{T.prezzo}{boxSeparato?.incluso ? " · solo abitazione" : ""}</span>
                  <input className={"v-input" + (errori.prezzo ? " v-input--errore" : "")} type="number" inputMode="numeric" min={0} placeholder="450000"
                         aria-invalid={!!errori.prezzo}
                         value={i.prezzoRichiesto || ""} onChange={(e) => set({ prezzoRichiesto: numero(e.target.value) || null })} />
                  {errori.prezzo && <span className="v-field__hint v-field__hint--errore" role="alert">{errori.prezzo}</span>}
                  <span className="v-field__hint">
                    {T.prezzoHint}
                    {boxSeparato?.incluso ? " Il prezzo del box sta nel suo campo, qui sopra: questo è solo quello dell'abitazione, non li sommiamo." : ""}
                  </span>
                </div>

                {ipotesiMateriali(i).length > 0 && i.mq > 0 && (
                  <div className={"v-note" + (i.simulazioneDati ? "" : " v-note--errore")} role={i.simulazioneDati ? undefined : "alert"}>
                    <p style={{ margin: 0 }}>
                      <b>Dati non confermati: {ipotesiMateriali(i).map((x) => NOME_CAMPO[x.campo]).join(", ")}.</b> Sono predefiniti o «non lo so»,
                      non fatti della casa: finché restano così non c&apos;è una valutazione. Confermali qui sopra, oppure chiedi una simulazione.
                    </p>
                    <label className="v-toggle" style={{ marginTop: "var(--s-3)" }}>
                      <span>Simulazione con dati incompleti<small>Il calcolo usa le ipotesi elencate e le scrive accanto al numero. Niente giudizi caro/conveniente, niente offerte, niente prezzo di pubblicazione: sono ipotesi, e l&apos;incertezza dichiarata non le copre.</small></span>
                      <input type="checkbox" checked={!!i.simulazioneDati} onChange={(e) => set({ simulazioneDati: e.target.checked })} />
                    </label>
                    {i.simulazioneDati && (
                      <ul className="v-ipotesi">
                        {ipotesiDi(i).map((x) => <li key={x.campo}>{descriviIpotesi(x)}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                {avviso && <p className="v-note">{avviso}</p>}
              </div>

              <div className="v-actions">
                <button className="v-btn v-btn--accent v-btn--lg"
                        onClick={() => erroriAttivi.length ? setAvviso(`Correggi prima: ${erroriAttivi.join(" ")}`)
                                     : pianoBloccato ? setAvviso(PIANO_NON_VALUTABILE(i.pianoDichiarato!))
                                     : ipotesiMateriali(i).length && !i.simulazioneDati && i.mq > 0 ? setAvviso(DATI_NON_CONFERMATI(ipotesiMateriali(i)))
                                     : i.mq > 0 ? (setAvviso(null), setVista("calcolo"))
                                     : setAvviso("Manca la superficie: senza metri quadri non c'è stima.")}>
                  Valuta
                </button>
                <button className="v-btn v-btn--bare" onClick={() => setVista("dove")}>Indietro</button>
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------- RISULTATO */}
        {vista === "risultato" && esito && zona && intento && (
          <Risultato
            stima={esito.stima} input={i} zonaDesc={zona.d}
            indirizzo={indirizzo} insight={insight} intento={intento}
            switchIntento={switchIntento}
            primaCasa={primaCasa} onPrimaCasa={setPrimaCasa}
            lavori={lavori} onLavori={setLavori}
            onModifica={() => setVista("casa")}
          />
        )}
      </main>

      <footer className="v-footer">
        <div className="v-wrap v-footer__in">
          <span className="v-brand" aria-label="Valmiro">Valmir<span aria-hidden="true">o</span></span>
          <p className="v-micro">{FONTE}. Le stime sono indicative e non costituiscono perizia.</p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ RISULTATO */

function Risultato({
  stima, input, zonaDesc, indirizzo, insight, intento, switchIntento,
  primaCasa, onPrimaCasa, lavori, onLavori, onModifica,
}: {
  stima: Stima; input: Input; zonaDesc: string;
  indirizzo: string; insight: React.ReactNode; intento: Intento; switchIntento: React.ReactNode;
  primaCasa: boolean; onPrimaCasa: (v: boolean) => void;
  lavori: SceltaLavori; onLavori: (v: SceltaLavori) => void;
  onModifica: () => void;
}) {
  const tacche = stima.affidabilita === "Alta" ? 3 : stima.affidabilita === "Media" ? 2 : 1;
  const affitto = rendita(input, stima);
  const storia = andamento(input.zona);
  const T = TESTI[intento];
  /* I capitoli si numerano da soli: alcuni compaiono solo quando hanno qualcosa da dire. */
  let capitolo = 1;
  const cap = () => String(++capitolo).padStart(2, "0");
  const mostraConfronto = intento === "vendo" || !!input.prezzoRichiesto;
  const simulazione = stima.simulazione;
  const ipotesi = stima.ipotesi && stima.ipotesi.length ? stima.ipotesi : null;
  /* uno scenario, di piano o con dati incompleti: le parole cambiano in ogni capitolo */
  const scenario = !!simulazione || !!ipotesi;
  const etichettaScenario = simulazione && ipotesi ? "Simulazione: piano terra ipotizzato, dati incompleti"
    : simulazione ? "Simulazione che ipotizza un piano terra" : ipotesi ? "Simulazione con dati incompleti" : null;
  /* la riga breve da ripetere dove un capitolo puo' essere letto da solo */
  const promemoria = scenario ? (
    <p className="v-small v-promemoria">
      <b>Scenario, non valutazione.</b>
      {simulazione ? ` Ipotizza un piano terra al posto del ${simulazione.pianoDichiarato} dichiarato.` : ""}
      {ipotesi ? ` Usa dati non confermati: ${ipotesi.map((x) => x.split(" — ")[0]).join("; ")}.` : ""}
    </p>
  ) : null;
  const boxAParte = !!input.boxSeparato?.incluso && stima.valoreBox > 0;

  return (
    <>
      {/* 01 — quanto vale */}
      <section className="v-wrap v-result__hero">
        <p className="v-eyebrow">{indirizzo}{etichettaScenario ? ` · ${etichettaScenario.toLowerCase()}` : ""}</p>
        <p className="v-value">
          <span className="v-value__cur">€</span><NumeroAnimato valore={stima.centro} durata={1100} />
        </p>
        <p className="v-value__span">
          {scenario ? "Intervallo della simulazione" : "Intervallo realistico"} {eur(stima.min)} – {eur(stima.max)} €
        </p>
        {boxAParte && (
          <p className="v-small" style={{ marginTop: "var(--s-2)" }}>
            Di cui abitazione <b>{eur(stima.abitazione.centro)} €</b> ({eur(stima.abitazione.min)} – {eur(stima.abitazione.max)} €)
            e box venduto a parte <b>{eur(stima.valoreBox)} €</b>: due valori distinti, sommati qui sopra. Il metro quadro e il confronto
            con le quotazioni OMI riguardano la sola abitazione; con il box dentro sarebbero {eur(stima.euroMqTotale)} €/mq, un numero che
            non si confronta con niente.
          </p>
        )}
        <p className="v-small" style={{ marginTop: "var(--s-3)" }}>
          Zona OMI <b>{input.zona}</b> · {zonaDesc} · quotazioni {stima.semestre}
        </p>
        {simulazione && (
          <p className="v-note v-note--errore" role="note" style={{ marginTop: "var(--s-4)" }}>
            <b>Non è una valutazione del {simulazione.pianoDichiarato}.</b> {simulazione.testo} Il piano dichiarato è salvato con la stima.
          </p>
        )}
        {ipotesi && (
          <div className="v-note v-note--errore" role="note" style={{ marginTop: "var(--s-4)" }}>
            <p style={{ margin: 0 }}>
              <b>Simulazione con dati incompleti.</b> Questo numero usa ipotesi che nessuno ha confermato; le trovi qui, accanto al valore,
              e nella stima salvata. Finché restano ipotesi non ci sono giudizi sul prezzo, offerte né prezzo di pubblicazione.
              L&apos;incertezza indicata è quella del modello a dati noti: non copre queste ipotesi.
            </p>
            <ul className="v-ipotesi">{ipotesi.map((x, n) => <li key={n}>{x}</li>)}</ul>
          </div>
        )}
        <div style={{ marginTop: "var(--s-4)" }}>{switchIntento}</div>

        <dl className="v-facts">
          <div className="v-fact">
            <dt>Al metro quadro{boxAParte ? " · abitazione" : ""}</dt>
            <dd>{eur(stima.euroMq)} €</dd>
          </div>
          <div className="v-fact">
            <dt>Superficie commerciale</dt>
            <dd>{num(stima.superficieCommerciale)} mq</dd>
          </div>
          <div className="v-fact">
            <dt>Affidabilità</dt>
            <dd>
              <span className="v-conf">
                <span className="v-conf__bars" aria-hidden="true">
                  {[1, 2, 3].map((n) => <i key={n} className={n <= tacche ? "on" : ""} />)}
                </span>
                <span className="v-conf__lbl">{scenario ? "Simulazione" : stima.affidabilita} · ± {num(stima.sigma * 100, 1)}%</span>
              </span>
            </dd>
          </div>
        </dl>

        {insight && <p className="v-insight">{insight}</p>}
        {stima.avvertenza && <p className="v-note">{stima.avvertenza}</p>}
      </section>

      {/* il prezzo contro la stima */}
      {mostraConfronto && (
        <section className="v-wrap v-chapter">
          <Reveal>
            <div className="v-chapter__head">
              <span className="v-numeral">{cap()}</span>
              <h2 className="v-h2">{scenario ? "Prezzi e valori dello scenario" : T.confronto}</h2>
            </div>
            <AskingPrice input={input} stima={stima} intento={intento} />
          </Reveal>
        </section>
      )}

      {/* perche' vale questa cifra */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">{cap()}</span>
            <h2 className="v-h2">Perché vale questa cifra</h2>
          </div>
          <FactorExplanation stima={stima} />
          <p className="v-small" style={{ marginTop: "var(--s-5)", maxWidth: "46ch" }}>
            Ogni riga è un coefficiente dichiarato del motore. Se non sei d&apos;accordo con una voce,
            la vedi e puoi cambiare i dati.
          </p>
        </Reveal>
      </section>

      {/* ristrutturazione */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">{cap()}</span>
            <h2 className="v-h2">{intento === "compro" ? "Se la sistemi: costi e valore" : "Conviene sistemarla prima di vendere?"}</h2>
          </div>
          <p className="v-lead v-measure" style={{ marginBottom: "clamp(28px,4vw,44px)" }}>
            Tre pacchetti per partire, poi ogni intervento si tiene, si toglie, si segna come già fatto o si sostituisce
            con un preventivo. Il valore atteso dipende dai lavori che restano, non dal nome del pacchetto.
          </p>
          {promemoria}
          <RenovationSelector input={input} stima={stima} primaCasa={primaCasa} onPrimaCasa={onPrimaCasa} intento={intento} lavori={lavori} onLavori={onLavori} />
        </Reveal>
      </section>

      {/* affitto */}
      {affitto && (
        <section className="v-wrap v-chapter">
          <Reveal>
            <div className="v-chapter__head">
              <span className="v-numeral">{cap()}</span>
              <h2 className="v-h2">{intento === "compro" ? "Se la compri per affittarla" : "Se invece la affitti"}</h2>
            </div>
            <p className="v-lead v-measure" style={{ marginBottom: "clamp(28px,4vw,44px)" }}>
              L&apos;Agenzia delle Entrate pubblica anche i canoni di locazione della zona. Li portiamo su questa
              casa con le stesse proporzioni del prezzo: le caratteristiche che la fanno valere di più la fanno
              anche affittare di più.
            </p>
            {promemoria}
            <RentalYield r={affitto} zona={input.zona} />
          </Reveal>
        </section>
      )}

      {affitto && (
        <section className="v-wrap v-chapter">
          <Reveal>
            <div className="v-chapter__head">
              <span className="v-numeral">{cap()}</span>
              <h2 className="v-h2">E se la affitti a notte?</h2>
            </div>
            <p className="v-lead v-measure" style={{ marginBottom: "clamp(28px,4vw,44px)" }}>
              Qui non ci sono dati ufficiali: è uno scenario, con le ipotesi in vista. Muovile e guarda
              dove sta il pareggio con il contratto lungo, che è il numero che conta.
            </p>
            {promemoria}
            <ShortRent lungo={affitto} stima={stima} />
          </Reveal>
        </section>
      )}

      {/* il quartiere: posizione nella zona, storia, altre zone */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">{cap()}</span>
            <h2 className="v-h2">Il quartiere</h2>
          </div>
          <p className="v-lead v-measure">
            Zona OMI <b>{input.zona}</b> — {zonaDesc}. Le quotazioni sono pubblicate ogni semestre
            dall&apos;Agenzia delle Entrate e qui sono aggiornate all&apos;indice Istat dei prezzi delle abitazioni.
          </p>
          <h3 className="v-h3" style={{ marginTop: "var(--s-7)" }}>Come si posiziona nella zona</h3>
          <MarketRange zona={input.zona} tipo={input.tipo} euroMq={stima.euroMq} />
          {storia && (
            <>
              <h3 className="v-h3" style={{ marginTop: "var(--s-8)", marginBottom: "var(--s-4)" }}>La zona dal 2014</h3>
              <ZoneHistory a={storia} zona={input.zona} />
            </>
          )}
          <p style={{ marginTop: "var(--s-6)" }}>
            <Link className="v-btn v-btn--quiet" href="/quartieri">Vedi tutte le zone di Milano</Link>
          </p>
        </Reveal>
      </section>

      {/* fonti, note e chiusura */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">{cap()}</span>
            <h2 className="v-h2">Fonti, note e la tua stima</h2>
          </div>
          <p className="v-lead v-measure">
            Questa valutazione è già salvata{intento === "compro" ? " come casa che stai valutando per comprare" : " come casa da vendere"}.
            La ritrovi fra le tue stime, con la data e i dati che hai inserito.
          </p>
          <div className="v-actions">
            <Link className="v-btn" href="/stime">Le mie stime</Link>
            <button className="v-btn v-btn--quiet" onClick={onModifica}>Modifica i dati</button>
          </div>
          <div className="v-fonti">
            <p className="v-small v-measure">
              <b>Valore.</b> Quotazioni OMI {stima.semestre} della zona {input.zona} (fornitura diretta dell&apos;Agenzia delle
              Entrate), aggiornate con l&apos;indice Istat dei prezzi delle abitazioni, con coefficienti dichiarati per piano,
              ascensore, classe, luce e pertinenze. Superficie commerciale secondo il DPR 138/1998, allegato C. La stessa casa vale
              lo stesso per chi compra e per chi vende.
            </p>
            <p className="v-small v-measure">
              <b>Taratura, e cosa misura.</b> Il motore è stato tarato il 5 settembre 2026 su 201 annunci di vendita a Milano,
              raccolti dai portali con una ricerca assistita e verificati a campione (12 riletti a mano: prezzi e metri confermati
              in tutti, due stati corretti). La variabile di confronto è il <b>prezzo richiesto</b> nell&apos;annuncio contro il prezzo
              di pubblicazione stimato; la metrica è il logaritmo del rapporto: scarto mediano −0,3%, dispersione (MAD) 10% fuori dal
              segmento di pregio e 13% con il pregio dentro, 37% degli annunci entro ±10%. Sono numeri sul campione di taratura
              stesso: <b>un campione di verifica indipendente non c&apos;è ancora</b> (previsto con l&apos;API di Idealista). E i prezzi
              richiesti non sono prezzi di compravendita: la taratura dice quanto le stime somigliano a ciò che i venditori chiedono,
              non quanto a ciò che gli acquirenti pagano. Il metodo per esteso è in <code>docs/taratura.md</code>.
            </p>
            {simulazione && (
              <p className="v-small v-measure">
                <b>Simulazione.</b> Il piano dichiarato è «{simulazione.pianoDichiarato}», per cui il modello attuale non dispone di un
                trattamento validato. Tutti i numeri di questa pagina — valore, lavori, affitti — ipotizzano un piano terra su richiesta
                esplicita e non valgono per il piano vero; non sono un tetto e non danno un giudizio sul prezzo. La stima è salvata con questa avvertenza.
              </p>
            )}
            {stima.noteDati && stima.noteDati.length > 0 && (
              <p className="v-small v-measure">
                <b>Dati al predefinito.</b> {stima.noteDati.join("; ")}. Non cambiano il valore, ma non sono dati della casa.
              </p>
            )}
            {ipotesi && (
              <p className="v-small v-measure">
                <b>Dati non confermati.</b> Il calcolo usa, su richiesta esplicita, questi valori non confermati: {ipotesi.join("; ")}.
                Sono ipotesi, non fatti della casa; la provenienza di ogni dato (annuncio, utente, predefinito, «non lo so») è salvata con la stima.
              </p>
            )}
            <p className="v-small v-measure">
              <b>Validazione.</b> Protocollo predisposto (<code>docs/verifica.md</code>); validazione indipendente non ancora eseguita.
            </p>
            {boxAParte && (
              <p className="v-small v-measure">
                <b>Box a parte.</b> L&apos;annuncio vende il box separatamente e lo hai incluso: il suo valore ({eur(stima.valoreBox)} €) è tenuto
                distinto da quello dell&apos;abitazione, e il prezzo richiesto dell&apos;abitazione non viene mai sommato al valore del box.
                Il confronto sul totale c&apos;è solo se anche il prezzo del box è noto.
              </p>
            )}
            <p className="v-small v-measure">
              <b>Prezzi.</b> Il prezzo richiesto è un&apos;intenzione, non un valore. Il prezzo di pubblicazione possibile è il valore
              centrale più il 6%, una convenzione del motore che la taratura ha allineato in mediana ai prezzi richiesti degli
              annunci. L&apos;intervallo per un&apos;offerta è la metà bassa dell&apos;intervallo di stima. Nessuna di queste è una
              percentuale di trattativa misurata su compravendite.
            </p>
            <p className="v-small v-measure">
              <b>Lavori.</b> Costi medi di fascia per Milano, IVA esclusa, da prezzari e guide 2026; IVA 10% sui lavori con la regola
              dei beni significativi; spese tecniche 10% con cassa e IVA 22%; detrazione 50%/36% entro 96.000 € in dieci rate
              (legge di bilancio 2026). Il valore dopo i lavori dipende dallo stato raggiunto, non dalla spesa; la classe
              energetica non viene stimata.
            </p>
            <p className="v-small v-measure">
              <b>Affitti.</b> Canoni OMI {stima.semestre}; cedolare 21%, un mese di sfitto; IMU e straordinarie escluse. L&apos;affitto
              breve è uno scenario con ipotesi di settore, non un dato.
            </p>
          </div>
          <p className="v-disclaimer" style={{ marginTop: "var(--s-6)" }}>
            Stima automatica indicativa{etichettaScenario ? `, qui come ${etichettaScenario.toLowerCase()}` : ""}.
            Non costituisce perizia né valutazione ai sensi degli standard estimativi. Fonte: {stima.fonte}.
          </p>
        </Reveal>
      </section>
    </>
  );
}
