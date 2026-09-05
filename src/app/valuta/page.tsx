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
import { scala } from "@/lib/engine";
import { CATEGORIE, tipoDaCategoria, type Categoria } from "@/lib/catasto";
import { rendita, andamento } from "@/lib/affitto";
import { leggiAnnuncio, type Letto } from "@/lib/annuncio";
import AskingPrice from "@/components/sistema/AskingPrice";
import RentalYield from "@/components/sistema/RentalYield";
import ZoneHistory from "@/components/sistema/ZoneHistory";
import ShortRent from "@/components/sistema/ShortRent";
import { salvaStima, salvaStimaAccount } from "@/lib/storage";
import { useSessione } from "@/lib/sessione";
import { FONTI, type FonteIndirizzo, type Input, type Intento, type Scelta, type Stato, type Stima, type Tipo } from "@/lib/types";

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

/** Un numero dal modulo: mai negativo, mai NaN. */
const nonNeg = (v: string) => Math.max(0, Number(v) || 0);

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
  const [salvata, setSalvata] = useState(false);
  const [mappaAperta, setMappaAperta] = useState(false);
  const [testoAnnuncio, setTestoAnnuncio] = useState("");
  const [letto, setLetto] = useState<Letto | null>(null);
  const [annuncioNota, setAnnuncioNota] = useState<string | null>(null);
  const [qIniziale, setQIniziale] = useState("");

  const [i, setI] = useState<Input>({
    zona: "", tipo: "civ", mq: 0, superficie: "commerciale", pertinenzeIncluse: true,
    mqBalconi: 0, mqTerrazzi: 0, cantina: false, box: "nessuno",
    stato: "abit", piano: "1-2", ascensore: true, classe: "D", luce: "media",
    epoca: null, affaccio: null, metro: null, prezzoRichiesto: null,
  });
  const set = (p: Partial<Input>) => setI((v) => ({ ...v, ...p }));
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
  async function leggiTesto() {
    const r = leggiAnnuncio(testoAnnuncio);
    if (!r.trovati.length) { setAnnuncioNota("Nel testo non ho riconosciuto né metri, né prezzo, né indirizzo. Prova a incollare tutta la scheda dell'annuncio, non solo il titolo."); return; }
    set({
      ...(r.mq ? { mq: r.mq, superficie: "commerciale", pertinenzeIncluse: true } : {}),
      ...(r.piano ? { piano: r.piano } : {}),
      ...(r.ascensore !== undefined ? { ascensore: r.ascensore } : {}),
      ...(r.stato ? { stato: r.stato } : {}), ...(r.classe ? { classe: r.classe } : {}),
      /* i metri delle pertinenze solo se l'annuncio li scrive: la presenza da sola non e' un numero */
      ...(r.mqBalconi ? { mqBalconi: r.mqBalconi } : {}),
      ...(r.mqTerrazzi ? { mqTerrazzi: r.mqTerrazzi } : {}),
      ...(r.cantina ? { cantina: true } : {}), ...(r.box ? { box: r.box } : {}),
      prezzoRichiesto: r.prezzo ?? null,
    });
    setLetto(r);
    if (!r.indirizzo) { setAnnuncioNota("Ho letto i dati della casa ma non l'indirizzo: cercalo qui sopra e i dati restano."); return; }
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
    if (!salvata && zona) {
      const da = {
        indirizzo: indirizzo || `Zona ${i.zona}`, zona: i.zona, descrizioneZona: zona.d,
        input: i, stima: e.stima, prezzoEsposto: i.prezzoRichiesto || undefined,
      };
      if (utente) salvaStimaAccount(utente.id, da); else salvaStima(da);
      setSalvata(true);
    }
  }

  /* Una sola frase di mercato, costruita sui numeri gia' calcolati. */
  const insight = useMemo(() => {
    if (!esito || !i.zona) return null;
    const s = scala(i.zona, i.tipo);
    const mediana = s.mediaN * INDICE_ISTAT;
    const scarto = (esito.stima.euroMq - mediana) / mediana;
    const f = ZONE[i.zona].f;
    if (Math.abs(scarto) < 0.04)
      return <>È <b>in linea con la mediana</b> della zona: {eur(mediana)} €/mq per un immobile in stato normale.</>;
    return scarto > 0
      ? <>Vale <b>il {num(scarto * 100)}% in più</b> della mediana di zona ({eur(mediana)} €/mq): sono piano, stato e caratteristiche a spingerla verso l&apos;alto della forbice {FASCIA_NOME[f]?.toLowerCase()}.</>
      : <>Vale <b>il {num(Math.abs(scarto) * 100)}% in meno</b> della mediana di zona ({eur(mediana)} €/mq): è lo spazio che una ristrutturazione può recuperare.</>;
  }, [esito, i.zona, i.tipo]);

  const pertinenzeDaChiedere = i.superficie === "calpestabile" || i.pertinenzeIncluse === false;

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
                  <div className="v-actions">
                    <button className="v-btn" disabled={testoAnnuncio.trim().length < 20} onClick={leggiTesto}>Leggi l&apos;annuncio</button>
                  </div>
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
                    <div className="v-actions">
                      <button className="v-btn" disabled={testoAnnuncio.trim().length < 20} onClick={leggiTesto}>Leggi l&apos;annuncio</button>
                    </div>
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
                    {letto.balconi && !letto.mqBalconi && letto.terrazzo && !letto.mqTerrazzi
                      ? " I metri di balconi e terrazzo non erano scritti: se li conosci e non sono già nella superficie, inseriscili qui sotto."
                      : letto.balconi && !letto.mqBalconi
                      ? " I metri dei balconi non erano scritti: se li conosci e non sono già nella superficie, inseriscili qui sotto."
                      : letto.terrazzo && !letto.mqTerrazzi
                      ? " I metri del terrazzo non erano scritti: se li conosci e non sono già nella superficie, inseriscili qui sotto."
                      : ""}
                  </p>
                )}
              </div>

              <div className="v-fields">
                <div className="v-field">
                  <span className="v-field__lbl">Superficie</span>
                  <div className="v-row2">
                    <input className="v-input" type="number" inputMode="numeric" min={0} placeholder="93"
                           value={i.mq || ""} onChange={(e) => set({ mq: nonNeg(e.target.value) })} />
                    <select className="v-select" value={i.superficie || "commerciale"}
                            onChange={(e) => set({ superficie: e.target.value as Input["superficie"] })}>
                      <option value="commerciale">metri commerciali</option>
                      <option value="calpestabile">metri calpestabili</option>
                    </select>
                  </div>
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
                           onChange={(e) => set({ pertinenzeIncluse: e.target.checked })} />
                  </label>
                )}

                {pertinenzeDaChiedere && (
                  <>
                    <div className="v-row2">
                      <label className="v-field">
                        <span className="v-field__lbl">Balconi, m²</span>
                        <input className="v-input" type="number" inputMode="decimal" min={0} step="0.5" placeholder="0"
                               value={i.mqBalconi || ""} onChange={(e) => set({ mqBalconi: nonNeg(e.target.value) })} />
                        <span className="v-field__hint">Sporgono dalla facciata, di solito stretti: si sta in piedi, non a tavola.</span>
                      </label>
                      <label className="v-field">
                        <span className="v-field__lbl">Terrazzi, m²</span>
                        <input className="v-input" type="number" inputMode="decimal" min={0} step="0.5" placeholder="0"
                               value={i.mqTerrazzi || ""} onChange={(e) => set({ mqTerrazzi: nonNeg(e.target.value) })} />
                        <span className="v-field__hint">Sopra un altro locale o in arretramento, abbastanza larghi da viverci.</span>
                      </label>
                    </div>
                    <p className="v-small v-measure">
                      Contano al 30% fino a 25 m² complessivi e al 10% oltre, come nel DPR 138/1998: la regola non distingue il balcone
                      dal terrazzo, li pesa insieme per la loro superficie. Li chiediamo separati per chiarezza e per il futuro.
                    </p>
                    <label className="v-toggle">
                      <span>Cantina o soffitta<small>Aggiunge 2,5 m² commerciali: il 25% di una cantina da 10 m², come nel DPR 138/1998</small></span>
                      <input type="checkbox" checked={!!i.cantina} onChange={(e) => set({ cantina: e.target.checked })} />
                    </label>
                  </>
                )}

                <div className="v-field">
                  <span className="v-field__lbl">In che stato è</span>
                  <div className="v-choices">
                    {STATI.map((s) => (
                      <button key={s.id} className="v-choice" aria-pressed={i.stato === s.id}
                              onClick={() => set({ stato: s.id })}>
                        <b>{s.t}</b><small>{s.d}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="v-row2">
                  <label className="v-field">
                    <span className="v-field__lbl">Piano</span>
                    <select className="v-select" value={i.piano}
                            onChange={(e) => set({ piano: e.target.value as Input["piano"] })}>
                      {PIANI.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="v-field">
                    <span className="v-field__lbl">Classe energetica</span>
                    <select className="v-select" value={i.classe}
                            onChange={(e) => set({ classe: e.target.value as Input["classe"] })}>
                      {CLASSI.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>

                <label className="v-toggle">
                  <span>Ascensore<small>Dal terzo piano in su pesa molto</small></span>
                  <input type="checkbox" checked={i.ascensore}
                         onChange={(e) => set({ ascensore: e.target.checked })} />
                </label>

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
                    <input type="checkbox" checked={!!i.cantina} onChange={(e) => set({ cantina: e.target.checked })} />
                  </label>
                )}

                <div className="v-field">
                  <span className="v-field__lbl">
                    Posto auto{zona.box ? ` · box quotato ${eur(zona.box[0])}–${eur(zona.box[1])} €/mq` : ""}
                  </span>
                  <div className="v-choices v-choices--4">
                    {([["nessuno", "Nessuno"], ["posto", "Posto auto"], ["box", "Box"]] as const).map(([id, t]) => (
                      <button key={id} className="v-choice" aria-pressed={i.box === id}
                              onClick={() => set({ box: id })}>
                        <b>{t}</b>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="v-field">
                  <span className="v-field__lbl">{T.prezzo}</span>
                  <input className="v-input" type="number" inputMode="numeric" min={0} placeholder="450000"
                         value={i.prezzoRichiesto || ""} onChange={(e) => set({ prezzoRichiesto: nonNeg(e.target.value) || null })} />
                  <span className="v-field__hint">{T.prezzoHint}</span>
                </div>

                {avviso && <p className="v-note">{avviso}</p>}
              </div>

              <div className="v-actions">
                <button className="v-btn v-btn--accent v-btn--lg"
                        onClick={() => i.mq > 0 ? (setAvviso(null), setVista("calcolo"))
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
  primaCasa, onPrimaCasa, onModifica,
}: {
  stima: Stima; input: Input; zonaDesc: string;
  indirizzo: string; insight: React.ReactNode; intento: Intento; switchIntento: React.ReactNode;
  primaCasa: boolean; onPrimaCasa: (v: boolean) => void;
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

  return (
    <>
      {/* 01 — quanto vale */}
      <section className="v-wrap v-result__hero">
        <p className="v-eyebrow">{indirizzo}</p>
        <p className="v-value">
          <span className="v-value__cur">€</span><NumeroAnimato valore={stima.centro} durata={1100} />
        </p>
        <p className="v-value__span">
          Intervallo realistico {eur(stima.min)} – {eur(stima.max)} €
        </p>
        <p className="v-small" style={{ marginTop: "var(--s-3)" }}>
          Zona OMI <b>{input.zona}</b> · {zonaDesc} · quotazioni {stima.semestre}
        </p>
        <div style={{ marginTop: "var(--s-4)" }}>{switchIntento}</div>

        <dl className="v-facts">
          <div className="v-fact">
            <dt>Al metro quadro</dt>
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
                <span className="v-conf__lbl">{stima.affidabilita} · ± {num(stima.sigma * 100, 1)}%</span>
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
              <h2 className="v-h2">{T.confronto}</h2>
            </div>
            <AskingPrice richiesto={input.prezzoRichiesto ?? null} stima={stima} intento={intento} />
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
          <RenovationSelector input={input} stima={stima} primaCasa={primaCasa} onPrimaCasa={onPrimaCasa} intento={intento} />
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
              <b>Valore.</b> Quotazioni OMI {stima.semestre} della zona {input.zona}, aggiornate con l&apos;indice Istat dei prezzi
              delle abitazioni, con coefficienti dichiarati per piano, ascensore, classe, luce e pertinenze. Superficie commerciale
              secondo il DPR 138/1998, allegato C. Motore tarato su 201 annunci milanesi verificati (settembre 2026): errore
              mediano −0,3%, dispersione 10–13%. La stessa casa vale lo stesso per chi compra e per chi vende.
            </p>
            <p className="v-small v-measure">
              <b>Prezzi.</b> Il prezzo richiesto è un&apos;intenzione, non un valore. Il prezzo di pubblicazione possibile è la mediana
              osservata sugli annunci di taratura, il 6% sopra il valore. L&apos;intervallo per un&apos;offerta è la metà bassa
              dell&apos;intervallo di stima. Nessuna di queste è una percentuale di trattativa garantita.
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
            Stima automatica indicativa. Non costituisce perizia né valutazione ai sensi degli standard estimativi. Fonte: {stima.fonte}.
          </p>
        </Reveal>
      </section>
    </>
  );
}
