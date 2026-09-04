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
import RenovationSelector, { type Prospetto } from "@/components/sistema/RenovationSelector";
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
import { RISTRUTTURAZIONE, scala } from "@/lib/engine";
import { salvaStima, salvaStimaAccount } from "@/lib/storage";
import { useSessione } from "@/lib/sessione";
import type { FonteIndirizzo, Input, Scelta, Stato, Stima, Tipo } from "@/lib/types";

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

type Esito = { stima: Stima; prospetti: Record<string, Prospetto> };

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

  const [vista, setVista] = useState<"dove" | "casa" | "calcolo" | "risultato">("dove");
  const [indirizzo, setIndirizzo] = useState("");
  const [fonte, setFonte] = useState<FonteIndirizzo>("dizionario");
  const [avviso, setAvviso] = useState<string | null>(null);
  const [primaCasa, setPrimaCasa] = useState(true);
  const [scenario, setScenario] = useState("attuale");
  const [esito, setEsito] = useState<Esito | null>(null);
  const [salvata, setSalvata] = useState(false);
  const [mappaAperta, setMappaAperta] = useState(false);

  const [i, setI] = useState<Input>({
    zona: "", tipo: "civ", mq: 0, balconi: 0, cantina: false, box: "nessuno",
    stato: "abit", piano: "1-2", ascensore: true, classe: "D", luce: "media",
    epoca: null, affaccio: null, metro: null,
  });
  const set = (p: Partial<Input>) => setI((v) => ({ ...v, ...p }));
  const zona = i.zona ? ZONE[i.zona] : null;

  /* L'indirizzo arriva dalla home nell'URL: la valutazione e' ricaricabile. */
  useEffect(() => {
    const z = params.get("zona");
    if (z && ZONE[z]) {
      setI((v) => ({ ...v, zona: z }));
      setIndirizzo(params.get("ind") || ZONE[z].d);
      const f = params.get("f");
      setFonte(f === "civico" || f === "via" ? f : "dizionario");
      setVista("casa");
    }
  }, [params]);

  function scegliIndirizzo(s: Scelta) {
    set({ zona: s.zona }); setIndirizzo(s.etichetta); setFonte(s.fonte);
    setAvviso(null); setVista("casa");
  }

  /* Tre chiamate parallele: la stima e' identica in tutte e tre, cambia solo il
     livello di ristrutturazione. Nessuna modifica alla rotta o al motore. */
  const calcola = useCallback(async (): Promise<Esito> => {
    const risposte = await Promise.all(
      RISTRUTTURAZIONE.map((r) =>
        fetch("/api/estimate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...i, ristrutturazione: r.id, primaCasa }),
        }).then((x) => x.json())
      )
    );
    const errore = risposte.find((r) => r.errore);
    if (errore) throw new Error(errore.errore);
    const prospetti: Record<string, Prospetto> = {};
    RISTRUTTURAZIONE.forEach((r, n) => { prospetti[r.id] = risposte[n].ristrutturazione; });
    return { stima: risposte[0].stima, prospetti };
  }, [i, primaCasa]);

  /* Cambiare "prima casa" ricalcola solo le detrazioni: aggiorniamo in silenzio,
     senza rifare la transizione. */
  useEffect(() => {
    if (vista !== "risultato") return;
    let vivo = true;
    calcola().then((e) => vivo && setEsito(e)).catch(() => {});
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaCasa]);

  function fatto(e: Esito) {
    setEsito(e); setVista("risultato");
    if (!salvata && zona) {
      const da = {
        indirizzo: indirizzo || `Zona ${i.zona}`, zona: i.zona, descrizioneZona: zona.d,
        input: i, stima: e.stima,
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
        {/* ---------------------------------------------------- DOVE */}
        {vista === "dove" && (
          <section className="v-wrap v-section">
            <div className="v-form">
              <div className="v-form__head">
                <p className="v-eyebrow">Passo uno</p>
                <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Dove si trova la casa?</h1>
                <p className="v-lead" style={{ marginTop: "var(--s-4)", maxWidth: "40ch" }}>
                  Via e civico. Milano è divisa in 42 zone omogenee: è lì che si formano i prezzi.
                </p>
              </div>
              <AddressSearch onScegli={scegliIndirizzo} azione="Continua" autoFocus />
              <details
                className="v-more" style={{ marginTop: "var(--s-7)" }}
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
        {vista === "casa" && zona && (
          <section className="v-wrap v-section">
            <div className="v-form">
              <div className="v-form__head">
                <p className="v-eyebrow">Passo due</p>
                <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Raccontaci la casa</h1>
                <div style={{ marginTop: "var(--s-5)" }}>
                  <span className="v-locus">
                    <span><b>{indirizzo}</b> · zona {i.zona}, {zona.d}</span>
                    <button onClick={() => setVista("dove")}>Cambia</button>
                  </span>
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
              </div>

              <div className="v-fields">
                <div className="v-field">
                  <span className="v-field__lbl">Superficie</span>
                  <input className="v-input" type="number" inputMode="numeric" placeholder="93"
                         value={i.mq || ""} onChange={(e) => set({ mq: Number(e.target.value) })} />
                  <span className="v-field__hint">Metri quadri calpestabili. Balconi e cantina si aggiungono più sotto.</span>
                </div>

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

                <details className="v-more">
                  <summary>Altri dettagli — restringono l&apos;intervallo</summary>
                  <div className="v-more__in">
                    <div className="v-field">
                      <span className="v-field__lbl">Tipologia quotata in zona {i.zona}</span>
                      <div className="v-choices v-choices--4">
                        {TIPI.map((t) => {
                          const ok = zona[t.id] && Object.keys(zona[t.id]).length > 0;
                          return (
                            <button key={t.id} className="v-choice" aria-pressed={i.tipo === t.id}
                                    disabled={!ok} onClick={() => set({ tipo: t.id })}>
                              <b>{t.t}</b><small>{ok ? "quotata" : "non quotata qui"}</small>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="v-row2">
                      <label className="v-field">
                        <span className="v-field__lbl">Balconi e terrazzi</span>
                        <input className="v-input" type="number" inputMode="numeric" placeholder="0"
                               value={i.balconi || ""} onChange={(e) => set({ balconi: Number(e.target.value) })} />
                        <span className="v-field__hint">Contano al 25%</span>
                      </label>
                      <label className="v-field">
                        <span className="v-field__lbl">Luminosità</span>
                        <select className="v-select" value={i.luce}
                                onChange={(e) => set({ luce: e.target.value as Input["luce"] })}>
                          <option value="scarsa">scarsa</option>
                          <option value="media">media</option>
                          <option value="ottima">ottima</option>
                        </select>
                      </label>
                    </div>
                    <label className="v-toggle">
                      <span>Cantina o soffitta<small>Aggiunge 2,5 mq commerciali</small></span>
                      <input type="checkbox" checked={!!i.cantina}
                             onChange={(e) => set({ cantina: e.target.checked })} />
                    </label>
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
                  </div>
                </details>

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
        {vista === "risultato" && esito && zona && (
          <Risultato
            stima={esito.stima} prospetti={esito.prospetti} input={i} zonaDesc={zona.d}
            indirizzo={indirizzo} insight={insight}
            scenario={scenario} onScenario={setScenario}
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

/* ============================================================ RISULTATO ==== */

function Risultato({
  stima, prospetti, input, zonaDesc, indirizzo, insight,
  scenario, onScenario, primaCasa, onPrimaCasa, onModifica,
}: {
  stima: Stima; prospetti: Record<string, Prospetto>; input: Input; zonaDesc: string;
  indirizzo: string; insight: React.ReactNode;
  scenario: string; onScenario: (s: string) => void;
  primaCasa: boolean; onPrimaCasa: (v: boolean) => void;
  onModifica: () => void;
}) {
  const tacche = stima.affidabilita === "Alta" ? 3 : stima.affidabilita === "Media" ? 2 : 1;

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
      </section>

      {/* 02 — come si posiziona */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">02</span>
            <h2 className="v-h2">Come si posiziona nella zona</h2>
          </div>
          <MarketRange zona={input.zona} tipo={input.tipo} euroMq={stima.euroMq} />
        </Reveal>
      </section>

      {/* 03 — perche' vale questa cifra */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">03</span>
            <h2 className="v-h2">Perché vale questa cifra</h2>
          </div>
          <FactorExplanation stima={stima} />
          <p className="v-small" style={{ marginTop: "var(--s-5)", maxWidth: "46ch" }}>
            Ogni riga è un coefficiente dichiarato del motore. Se non sei d&apos;accordo con una voce,
            la vedi e puoi cambiare i dati.
          </p>
        </Reveal>
      </section>

      {/* 04 — il quartiere */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">04</span>
            <h2 className="v-h2">Il quartiere</h2>
          </div>
          <p className="v-lead v-measure">
            Zona OMI <b>{input.zona}</b> — {zonaDesc}. Le quotazioni sono pubblicate ogni semestre
            dall&apos;Agenzia delle Entrate e qui sono aggiornate all&apos;indice Istat dei prezzi delle abitazioni.
          </p>
          <p style={{ marginTop: "var(--s-5)" }}>
            <Link className="v-btn v-btn--quiet" href="/quartieri">Vedi tutte le zone di Milano</Link>
          </p>
        </Reveal>
      </section>

      {/* 05 — ristrutturata */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">05</span>
            <h2 className="v-h2">Quanto potrebbe valere ristrutturata</h2>
          </div>
          <p className="v-lead v-measure" style={{ marginBottom: "clamp(28px,4vw,44px)" }}>
            Le quotazioni ufficiali distinguono due stati di conservazione, non tre. Per questo
            tre livelli di spesa possono arrivare a due soli livelli di valore: quando succede
            te lo diciamo, invece di far salire il numero per farlo sembrare più interessante.
          </p>
          <RenovationSelector
            attuale={stima.centro} prospetti={prospetti}
            scelto={scenario} onSceglie={onScenario}
            primaCasa={primaCasa} onPrimaCasa={onPrimaCasa}
          />
        </Reveal>
      </section>

      {/* 06 — chiusura */}
      <section className="v-wrap v-chapter">
        <Reveal>
          <div className="v-chapter__head">
            <span className="v-numeral">06</span>
            <h2 className="v-h2">Tieni la stima</h2>
          </div>
          <p className="v-lead v-measure">
            Questa valutazione è già salvata. La ritrovi fra le tue stime, con la data e i dati che hai inserito.
          </p>
          <div className="v-actions">
            <Link className="v-btn" href="/stime">Le mie stime</Link>
            <button className="v-btn v-btn--quiet" onClick={onModifica}>Modifica i dati</button>
          </div>
          <p className="v-disclaimer" style={{ marginTop: "var(--s-8)" }}>
            Stima automatica indicativa costruita sulle quotazioni OMI {stima.semestre} della zona {input.zona},
            aggiornate con l&apos;indice Istat. Non costituisce perizia né valutazione ai sensi degli standard
            estimativi. Fonte: {stima.fonte}.
          </p>
        </Reveal>
      </section>
    </>
  );
}
