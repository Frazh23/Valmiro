"use client";
import { useState } from "react";
import Link from "next/link";
import Mappa from "@/components/Mappa";
import Ricerca, { type Scelta } from "@/components/Ricerca";
import Testata from "@/components/Testata";
import { salvaStima, salvaStimaAccount } from "@/lib/storage";
import { useSessione } from "@/lib/sessione";
import { ZONE, FONTE } from "@/lib/data";
import type { Input, Stima, Stato, Tipo } from "@/lib/types";

const eur = (n: number) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(Math.round(n));

const STATI: { id: Stato; t: string; d: string }[] = [
  { id: "rist", t: "Da ristrutturare", d: "Impianti e finiture da rifare" },
  { id: "abit", t: "Abitabile", d: "Si entra così, finiture datate" },
  { id: "otti", t: "Ottimo stato", d: "Ristrutturato negli ultimi 10 anni" },
  { id: "nuov", t: "Nuovo", d: "Mai abitato o appena consegnato" },
];
const TIPI: { id: Tipo; t: string }[] = [
  { id: "civ", t: "Appartamento" }, { id: "sig", t: "Signorile" },
  { id: "eco", t: "Economico" }, { id: "vil", t: "Villa" },
];
const PASSI = ["Dove", "Immobile", "Caratteristiche", "Prezzo esposto", "Stima"];

export default function Valuta() {
  const { utente } = useSessione();
  const [passo, setPasso] = useState(1);
  const [indirizzo, setIndirizzo] = useState<string | null>(null);
  const [preciso, setPreciso] = useState(false);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [modo, setModo] = useState<"vendo" | "compro">("vendo");
  const [prezzoEsposto, setPrezzoEsposto] = useState("");
  const [reno, setReno] = useState("completa");
  const [primaCasa, setPrimaCasa] = useState(true);
  const [ris, setRis] = useState<{ stima: Stima; ristrutturazione?: any } | null>(null);
  const [i, setI] = useState<Input>({
    zona: "", tipo: "civ", mq: 0, balconi: 0, cantina: false, box: "nessuno",
    stato: "abit", piano: "1-2", ascensore: true, classe: "D", luce: "media",
    epoca: null, affaccio: null, metro: null,
  });
  const set = (p: Partial<Input>) => setI((v) => ({ ...v, ...p }));
  const zona = i.zona ? ZONE[i.zona] : null;

  function scegli(s: Scelta) {
    set({ zona: s.zona }); setIndirizzo(s.etichetta); setPreciso(s.preciso); setAvviso(null);
  }

  async function calcola(salva = true) {
    const r = await fetch("/api/estimate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...i, ristrutturazione: reno, primaCasa }),
    }).then((x) => x.json());
    if (r.errore) { setAvviso(r.errore); return; }
    setRis(r); setPasso(5);
    if (salva && zona) {
      const da = {
        indirizzo: indirizzo || `Zona ${i.zona}`, zona: i.zona, descrizioneZona: zona.d,
        input: i, stima: r.stima, prezzoEsposto: Number(prezzoEsposto) || undefined,
      };
      if (utente) salvaStimaAccount(utente.id, da); else salvaStima(da);
    }
  }

  return (
    <main className="shell">
      <Testata badge={zona ? <>Zona OMI <b>{i.zona}</b> · {zona.d}</> : undefined} />
      <div className="steps">{PASSI.map((_, n) => <i key={n} className={n < passo ? "on" : ""} />)}</div>
      <div className="steplabel"><span>{PASSI[passo - 1]}</span><span>{passo} / 5</span></div>

      <div className="card">
        {passo === 1 && (<>
          <h1>Dove si trova la casa?</h1>
          <p className="sub">Scrivi via e civico, oppure indica il punto sulla mappa. Milano è divisa in 42 zone OMI: è lì che si formano i prezzi.</p>
          <div className="body">
            <Ricerca valore={indirizzo} onScegli={scegli} />
            {zona && (
              <div className={"conferma " + (preciso ? "ok" : "dubbia")}>
                <b>{indirizzo}</b> → zona {i.zona}, {zona.d}
                <small>{preciso ? "Indirizzo geocodificato: il punto cade dentro questa zona." : "Zona dedotta dal nome: se non è giusta, tocca il punto esatto sulla mappa."}</small>
              </div>
            )}
            <Mappa zona={i.zona || null} onPick={(z) => { set({ zona: z }); setIndirizzo(ZONE[z].d); setPreciso(true); }} />
          </div>
          <div className="nav">
            <button className="primary" disabled={!i.zona} onClick={() => setPasso(2)}>Continua</button>
            <div className="spacer" /><span className="mini">Nessuna registrazione</span>
          </div>
        </>)}

        {passo === 2 && zona && (<>
          <h1>Che immobile è, e quanto misura?</h1>
          <p className="sub">Serve la superficie commerciale: balconi e cantina si aggiungono qui con i loro pesi.</p>
          <div className="body">
            <div className="field"><span className="lbl">Tipologia quotata in zona {i.zona}</span>
              <div className="opts four">{TIPI.map((t) => {
                const ok = zona[t.id] && Object.keys(zona[t.id]).length > 0;
                return <button key={t.id} className="opt" aria-pressed={i.tipo === t.id} disabled={!ok} onClick={() => set({ tipo: t.id })}>
                  <span className="t">{t.t}</span><span className="d">{ok ? "quotata" : "non quotata qui"}</span></button>;
              })}</div>
            </div>
            <div className="row2">
              <label className="field"><span className="lbl">Superficie principale</span>
                <input type="number" value={i.mq || ""} onChange={(e) => set({ mq: Number(e.target.value) })} placeholder="93" />
                <span className="hint">mq calpestabili</span></label>
              <label className="field"><span className="lbl">Balconi e terrazzi</span>
                <input type="number" value={i.balconi || ""} onChange={(e) => set({ balconi: Number(e.target.value) })} placeholder="0" />
                <span className="hint">contano al 25%</span></label>
            </div>
            <label className="switch"><span>Cantina o soffitta<small>Aggiunge 2,5 mq commerciali</small></span>
              <input type="checkbox" checked={!!i.cantina} onChange={(e) => set({ cantina: e.target.checked })} /></label>
            <div className="field"><span className="lbl">Posto auto{zona.box ? ` · box quotato ${eur(zona.box[0])}–${eur(zona.box[1])} €/mq` : ""}</span>
              <div className="opts three">{(["nessuno", "posto", "box"] as const).map((b) => (
                <button key={b} className="opt" aria-pressed={i.box === b} onClick={() => set({ box: b })}>
                  <span className="t">{b === "nessuno" ? "Nessuno" : b === "posto" ? "Posto auto" : "Box"}</span></button>))}</div>
            </div>
            {avviso && <span className="hint">{avviso}</span>}
          </div>
          <div className="nav">
            <button className="primary" onClick={() => i.mq > 0 ? setPasso(3) : setAvviso("Inserisci la superficie")}>Continua</button>
            <button className="ghost" onClick={() => setPasso(1)}>Indietro</button>
          </div>
        </>)}

        {passo === 3 && (<>
          <h1>In che stato è, e a che piano?</h1>
          <p className="sub">Lo stato di conservazione decide dove cadi dentro la forbice OMI della zona.</p>
          <div className="body">
            <div className="field"><span className="lbl">Stato di conservazione</span>
              <div className="opts two">{STATI.map((s) => (
                <button key={s.id} className="opt" aria-pressed={i.stato === s.id} onClick={() => set({ stato: s.id })}>
                  <span className="t">{s.t}</span><span className="d">{s.d}</span></button>))}</div>
            </div>
            <div className="row2">
              <label className="field"><span className="lbl">Piano</span>
                <select value={i.piano} onChange={(e) => set({ piano: e.target.value as any })}>
                  {["terra", "rialzato", "1-2", "3-5", "6+", "ultimo"].map((p) => <option key={p}>{p}</option>)}</select></label>
              <label className="field"><span className="lbl">Classe energetica</span>
                <select value={i.classe} onChange={(e) => set({ classe: e.target.value as any })}>
                  {["A", "B", "C", "D", "E", "F", "G"].map((c) => <option key={c}>{c}</option>)}</select></label>
            </div>
            <label className="switch"><span>Ascensore<small>Sopra il terzo piano pesa molto</small></span>
              <input type="checkbox" checked={i.ascensore} onChange={(e) => set({ ascensore: e.target.checked })} /></label>
            <div className="field"><span className="lbl">Luminosità</span>
              <div className="seg">{(["scarsa", "media", "ottima"] as const).map((l) => (
                <button key={l} aria-pressed={i.luce === l} onClick={() => set({ luce: l })}>{l}</button>))}</div>
            </div>
          </div>
          <div className="nav">
            <button className="primary" onClick={() => setPasso(4)}>Continua</button>
            <button className="ghost" onClick={() => setPasso(2)}>Indietro</button>
          </div>
        </>)}

        {passo === 4 && (<>
          <h1>Hai già un prezzo in mente?</h1>
          <p className="sub">Facoltativo. Il tuo prezzo se stai vendendo, quello dell&apos;annuncio se stai comprando.</p>
          <div className="body">
            <label className="field"><span className="lbl">Prezzo richiesto o ipotizzato</span>
              <input type="number" value={prezzoEsposto} onChange={(e) => setPrezzoEsposto(e.target.value)} placeholder="339000" /></label>
          </div>
          <div className="nav">
            <button className="primary" onClick={() => calcola()}>Calcola la stima</button>
            <button className="ghost" onClick={() => { setPrezzoEsposto(""); calcola(); }}>Non ce l&apos;ho</button>
            <div className="spacer" /><button className="ghost" onClick={() => setPasso(3)}>Indietro</button>
          </div>
        </>)}

        {passo === 5 && ris && (() => {
          const s = ris.stima, pe = Number(prezzoEsposto) || 0, vendo = modo === "vendo";
          const d = pe ? ((pe - s.centro) / s.centro) * 100 : 0;
          return (<>
            <div className="seg" style={{ maxWidth: 320, marginBottom: 22 }}>
              <button aria-pressed={vendo} onClick={() => setModo("vendo")}>Sto vendendo</button>
              <button aria-pressed={!vendo} onClick={() => setModo("compro")}>Sto comprando</button>
            </div>
            <div className="lbl">Stima di mercato · {indirizzo}</div>
            <div className="range">{eur(s.min)} <em>–</em> {eur(s.max)} €</div>
            <div className="kpis">
              <div className="kpi"><div className="k">Al metro quadro</div><div className="v">{eur(s.euroMq)} €</div></div>
              <div className="kpi" style={{ background: "var(--accent-soft)" }}>
                <div className="k">{vendo ? "Prezzo di pubblicazione" : "Offerta consigliata"}</div>
                <div className="v">{eur(vendo ? s.pubblica : s.offerta)} €</div></div>
              <div className="kpi"><div className="k">Zona OMI</div><div className="v">{i.zona}</div></div>
              <div className="kpi"><div className="k">Affidabilità</div><div className="v">{s.affidabilita}</div></div>
            </div>
            {pe > 0 && (
              <div className={"verdict " + (d > 5 ? "high" : d < -5 ? "low" : "")}>
                {vendo
                  ? d > 5 ? <><b>Il tuo prezzo è sopra la stima del {d.toFixed(0)}%.</b> Sopra i {eur(s.max)} € i tempi di vendita si allungano.</>
                    : d < -5 ? <><b>Il tuo prezzo è sotto la stima del {Math.abs(d).toFixed(0)}%.</b> Sono circa {eur(s.centro - pe)} € lasciati sul tavolo.</>
                    : <><b>Il tuo prezzo è in linea con la stima.</b></>
                  : d > 5 ? <><b>Il venditore chiede il {d.toFixed(0)}% in più della stima.</b> Un&apos;offerta intorno a {eur(s.offerta)} € è difendibile con i numeri di zona.</>
                    : d < -5 ? <><b>Il prezzo richiesto è sotto la stima del {Math.abs(d).toFixed(0)}%.</b> Verifica i verbali d&apos;assemblea prima di muoverti.</>
                    : <><b>Il prezzo richiesto è allineato al mercato.</b></>}
              </div>
            )}
            {ris.ristrutturazione && (
              <details className="panel" open>
                <summary>{vendo ? "E se la ristrutturassi prima di vendere?" : "E se la ristrutturassi dopo l'acquisto?"}</summary>
                <div className="in">
                  <div className="seg" style={{ marginBottom: 14 }}>
                    {["base", "completa", "design"].map((r) => (
                      <button key={r} aria-pressed={reno === r} onClick={() => { setReno(r); calcola(false); }}>{r}</button>))}
                  </div>
                  <div className="rowline"><span>Costo dei lavori · {eur(ris.ristrutturazione.euroMq)} €/mq</span><span className="r">{eur(ris.ristrutturazione.costo)} €</span></div>
                  <div className="rowline"><span>Detrazione in {ris.ristrutturazione.rate} anni</span><span className="r pos">−{eur(ris.ristrutturazione.detrazione)} €</span></div>
                  <div className="rowline"><span>Valore dopo i lavori</span><span className="r">{eur(ris.ristrutturazione.valoreDopo)} €</span></div>
                  <div className="rowline"><span><b>Margine</b></span>
                    <span className={"r " + (ris.ristrutturazione.margine >= 0 ? "pos" : "neg")}>
                      {ris.ristrutturazione.margine >= 0 ? "+" : "−"}{eur(Math.abs(ris.ristrutturazione.margine))} €</span></div>
                  <label className="switch" style={{ marginTop: 14 }}>
                    <span>È la tua prima casa<small>Prima casa 50%, altri immobili 36%</small></span>
                    <input type="checkbox" checked={primaCasa} onChange={(e) => { setPrimaCasa(e.target.checked); calcola(false); }} /></label>
                </div>
              </details>
            )}
            <details className="panel"><summary>Come è stato calcolato</summary>
              <div className="in">
                {s.dettaglio.map((v, n) => (
                  <div className="rowline" key={n}><span>{v.voce}</span>
                    <span className={"r " + (v.effetto > 0 ? "pos" : v.effetto < 0 ? "neg" : "")}>
                      {v.effetto ? `${(v.effetto * 100).toFixed(0)}% · ` : ""}{v.euro >= 0 ? "+" : "−"}{eur(Math.abs(v.euro))} €</span></div>))}
                <div className="rowline"><span><b>Valore centrale</b></span><span className="r">{eur(s.centro)} €</span></div>
                <div className="rowline"><span>Incertezza</span><span className="r">± {(s.sigma * 100).toFixed(1)}%</span></div>
              </div>
            </details>
            <div className="nav">
              <Link className="ghost" href="/stime">Le mie stime</Link>
              <button className="ghost" onClick={() => setPasso(3)}>Modifica i dati</button>
              <div className="spacer" />
              <button className="ghost" onClick={() => { setRis(null); setPasso(1); setIndirizzo(null); set({ zona: "", mq: 0 }); }}>Nuova stima</button>
            </div>
            <p className="disclaimer">
              Stima automatica indicativa su quotazioni OMI {s.semestre} della zona {i.zona}, aggiornate con l&apos;indice Istat.
              Non costituisce perizia né valutazione ai sensi degli standard estimativi. Fonte: {s.fonte}.
            </p>
          </>);
        })()}
      </div>
      <p className="foot">{FONTE}.</p>
    </main>
  );
}
