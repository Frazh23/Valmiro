"use client";
import { useMemo, useState } from "react";
import NumeroAnimato from "./NumeroAnimato";
import { eur, num, pct } from "@/lib/formato";
import {
  PACCHETTI, prospettoRistrutturazione, scelteAlCambioPacchetto,
  type Modo, type Pacchetto, type Prospetto, type SceltaLavori, type Scelte,
} from "@/lib/ristrutturazione";
import type { Input, Intento, Stato, Stima } from "@/lib/types";

export type { Prospetto } from "@/lib/ristrutturazione";

const STATO_NOME: Record<Stato, string> = { rist: "da ristrutturare", abit: "abitabile", otti: "ottimo stato", nuov: "come nuova" };
const MODI: { id: Modo; t: string; breve: string }[] = [
  { id: "incluso", t: "Lo faccio, al costo stimato", breve: "nel conto, costo stimato" },
  { id: "preventivo", t: "Ho un preventivo", breve: "nel conto, con il tuo preventivo" },
  { id: "fatto", t: "Già fatto o non serve", breve: "già fatto" },
  { id: "escluso", t: "Non lo faccio", breve: "escluso" },
];

/**
 * Ristrutturazione. Prima un riepilogo semplice: pacchetto, valore atteso,
 * costo, detrazione. Poi, per chi lo cerca, «Personalizza gli interventi»:
 * ogni voce si tiene, si toglie, si segna come fatta o si sostituisce con il
 * preventivo di un fornitore. Il prospetto e' sempre quello del motore,
 * ricalcolato a ogni modifica: qui non si somma niente a mano.
 *
 * Due regole sull'onesta' dei numeri restano dalla versione precedente:
 * il valore dopo i lavori e' un intervallo, come la stima da cui deriva; il
 * margine non e' il protagonista, perche' e' il numero meno solido della pagina.
 */
export default function RenovationSelector({
  input, stima, primaCasa, onPrimaCasa, intento, lavori, onLavori,
}: {
  input: Input;
  stima: Stima;
  primaCasa: boolean;
  onPrimaCasa: (v: boolean) => void;
  intento: Intento;
  /** pacchetto e personalizzazioni: li tiene la pagina, perche' appartengono all'immobile
      e devono azzerarsi quando l'immobile cambia, non quando il componente si rimonta */
  lavori: SceltaLavori;
  onLavori: (v: SceltaLavori) => void;
}) {
  const { scelto, scelte } = lavori;
  const setScelto = (v: "attuale" | Pacchetto) => onLavori({ ...lavori, scelto: v });
  const setScelte = (f: Scelte | ((v: Scelte) => Scelte)) => onLavori({ ...lavori, scelte: typeof f === "function" ? f(lavori.scelte) : f });
  const [aperto, setAperto] = useState(false);
  const [avvisoCambio, setAvvisoCambio] = useState<string | null>(null);
  /* il box a parte senza prezzo non entra nell'esborso: non c'e' una cifra, e il suo valore stimato non la sostituisce */
  const boxSenzaPrezzo = !!input.boxSeparato?.incluso && !input.boxSeparato?.prezzo;
  const prezzoBox = input.boxSeparato?.incluso ? input.boxSeparato.prezzo || 0 : 0;
  const [prezzoAcquisto, setPrezzoAcquisto] = useState<number>((input.prezzoRichiesto || stima.abitazione?.centro || stima.centro) + prezzoBox);

  const p: Prospetto | null = useMemo(
    () => (scelto === "attuale" ? null : prospettoRistrutturazione(input, scelto, primaCasa, scelte)),
    [input, scelto, primaCasa, scelte]
  );
  /* Lo stesso pacchetto senza personalizzazioni: serve a dire quanto le scelte hanno spostato. */
  const pieno: Prospetto | null = useMemo(
    () => (scelto === "attuale" ? null : prospettoRistrutturazione(input, scelto, primaCasa, {})),
    [input, scelto, primaCasa]
  );

  const valore = p ? p.valoreDopo : stima.centro;
  const delta = valore - stima.centro;
  const pacchetto = PACCHETTI.find((x) => x.id === scelto);
  const personalizzato = Object.keys(scelte).length > 0;

  /* L'OMI pubblica due stati, non tre: oltre "come nuova" la zona non riconosce
     di piu'. Due pacchetti possono quindi arrivare allo stesso valore. Non lo
     nascondiamo dietro un premio inventato: lo diciamo. */
  const plateau = useMemo(() => {
    if (!p || p.mancanti.length) return null;
    const altri = PACCHETTI.filter((x) => x.id !== scelto)
      .map((x) => ({ x, pr: prospettoRistrutturazione(input, x.id, primaCasa, {}) }))
      .filter(({ pr }) => pr.valoreDopo === p.valoreDopo && pr.costo < p.costo);
    return altri[0]?.x ?? null;
  }, [p, scelto, input, primaCasa]);

  function scegliPacchetto(id: "attuale" | Pacchetto) {
    if (id !== "attuale" && scelto !== "attuale" && id !== scelto && personalizzato) {
      const tenute = scelteAlCambioPacchetto(scelte);
      const perse = Object.keys(scelte).length - Object.keys(tenute).length;
      onLavori({ scelto: id, scelte: tenute });
      setAvvisoCambio(
        `Cambiando pacchetto tengo ciò che riguarda la casa — «già fatto» e «non lo faccio» — ${perse ? `e azzero ${perse === 1 ? "il preventivo" : `${perse} preventivi`}, perché erano riferiti al pacchetto precedente` : "e non c'era altro da azzerare"}.`
      );
      return;
    }
    setAvvisoCambio(null);
    setScelto(id);
  }
  const setScelta = (id: string, s: Scelte[string]) => setScelte((v) => {
    const n = { ...v };
    if (!s || s.modo === "incluso") delete n[id]; else n[id] = s;
    return n;
  });

  return (
    <div className="v-reno">
      <div>
        <div className="v-scenari v-scenari--4" role="group" aria-label="Livello di intervento">
          <button className="v-scenario" aria-pressed={scelto === "attuale"} onClick={() => scegliPacchetto("attuale")}>Oggi</button>
          {PACCHETTI.map((r) => (
            <button key={r.id} className="v-scenario" aria-pressed={scelto === r.id} onClick={() => scegliPacchetto(r.id)}>{r.nome}</button>
          ))}
        </div>

        <p className="v-eyebrow">{p ? "Valore atteso dopo i lavori" : "Valore stimato oggi"}{stima.simulazione || stima.ipotesi?.length ? " · scenario, non valutazione" : ""}</p>
        <p className="v-reno__value" aria-live="polite"><NumeroAnimato valore={valore} /> €</p>
        {p && (
          <>
            <p className="v-reno__range">Intervallo {eur(p.valoreDopoMin)} – {eur(p.valoreDopoMax)} €</p>
            <p className={"v-reno__delta " + (delta >= 0 ? "pos" : "neg")}>
              {delta >= 0 ? "+" : "−"}{eur(Math.abs(delta))} € rispetto a oggi
            </p>
            <p className="v-small" style={{ marginTop: "var(--s-3)" }}>
              Oggi <b>«{STATO_NOME[p.statoAttuale]}»</b>, dopo i lavori <b>«{STATO_NOME[p.statoAtteso]}»</b>
              {p.statoAtteso === p.statoAttuale ? ": con questi lavori lo stato conservativo non cambia" : ""}.
            </p>
          </>
        )}

        {p && p.mancanti.length > 0 && (
          <p className="v-note" style={{ marginTop: "var(--s-4)" }}>
            Senza {p.mancanti.join(", ").toLowerCase()} la casa non arriva a «{STATO_NOME[p.statoPacchetto]}», lo stato che il pacchetto
            «{p.livello}» avrebbe raggiunto: il valore atteso è quello di «{STATO_NOME[p.statoAtteso]}». Spendere meno non porta lo stesso risultato.
          </p>
        )}
        {plateau && (
          <p className="v-plateau">
            Stesso valore di <b>{plateau.nome}</b>. Le quotazioni ufficiali si fermano allo stato «come nuova»: oltre quella soglia la zona
            non riconosce di più, e la differenza fra i due pacchetti è tutta nel costo.
          </p>
        )}
        {avvisoCambio && <p className="v-note" style={{ marginTop: "var(--s-4)" }}>{avvisoCambio}</p>}
        {p && p.errori.length > 0 && (
          <p className="v-note v-note--errore" style={{ marginTop: "var(--s-4)" }} role="alert">
            Riepilogo incompleto: {p.errori.join("; ")}. Le voci con un dato non valido non entrano nel conto né nello stato atteso.
          </p>
        )}

        {p ? (
          <>
            {pacchetto && !aperto && <p className="v-reno__what">{pacchetto.cosa}</p>}

            {/* Due blocchi, due momenti: quello che si paga oggi e quello che torna negli anni.
                Il costo netto non e' liquidita': sta nel secondo blocco, con le parole giuste. */}
            <div className="v-reno__blocco">
              <p className="v-eyebrow">Da pagare per i lavori · oggi</p>
              <div className="v-reno__lines">
                <div className="v-factor">
                  <span className="v-factor__n">Lavori · imponibile{personalizzato && pieno ? `, pacchetto pieno ${eur(pieno.lavori)} €` : ""}</span>
                  <span className="v-factor__v">{eur(p.lavori)} €</span>
                </div>
                <div className="v-factor">
                  <span className="v-factor__n">IVA sui lavori</span>
                  <span className="v-factor__v">{eur(p.iva)} €</span>
                </div>
                <div className="v-factor">
                  <span className="v-factor__n">Progettazione, direzione lavori e pratiche</span>
                  <span className="v-factor__v">{eur(p.tecnici + p.pratiche)} €</span>
                </div>
                <div className="v-factor v-factor--total">
                  <span className="v-factor__n">Da pagare, tutto compreso</span>
                  <span className="v-factor__v">{eur(p.costo)} €</span>
                </div>
              </div>
            </div>
            <div className="v-reno__blocco v-reno__blocco--fisco">
              <p className="v-eyebrow">Recupero fiscale · negli anni, non oggi</p>
              <div className="v-reno__lines">
                <div className="v-factor">
                  <span className="v-factor__n">Detrazione Irpef: {eur(p.rataAnnua)} € l&apos;anno per {p.rate} anni</span>
                  <span className="v-factor__v pos">+{eur(p.detrazione)} €</span>
                </div>
                <div className="v-factor v-factor--total">
                  <span className="v-factor__n">Costo netto, a fine detrazione ({p.rate} anni)</span>
                  <span className="v-factor__v">{eur(p.costoNetto)} €</span>
                </div>
              </div>
              <p className="v-small v-measure" style={{ marginTop: "var(--s-3)" }}>
                I {eur(p.costo)} € vanno pagati subito, per intero. La detrazione torna in {p.rate} rate sull&apos;Irpef: spetta al
                {primaCasa ? " 50% perché è l'abitazione principale" : " 36% perché non è l'abitazione principale"}, entro 96.000 € di spesa, e
                solo se c&apos;è Irpef abbastanza da assorbirla.
              </p>
            </div>

            <label className="v-toggle" style={{ marginTop: "var(--s-5)" }}>
              <span>È la tua abitazione principale<small>Nel 2026 la detrazione è del 50% sulla prima casa, del 36% sulle altre. Dal 2027 scendono a 36% e 30%.</small></span>
              <input type="checkbox" checked={primaCasa} onChange={(e) => onPrimaCasa(e.target.checked)} />
            </label>

            <div className="v-actions" style={{ marginTop: "var(--s-5)" }}>
              <button className="v-btn v-btn--quiet" onClick={() => setAperto((a) => !a)} aria-expanded={aperto}>
                {aperto ? "Chiudi gli interventi" : "Personalizza gli interventi"}
              </button>
              {personalizzato && (
                <button className="v-btn v-btn--bare" onClick={() => { setScelte({}); setAvvisoCambio(null); }}>
                  Ripristina il pacchetto «{p.livello}»
                </button>
              )}
            </div>

            {aperto && (
              <div className="v-interventi">
                <p className="v-small v-measure">
                  Ogni riga: l&apos;intervento, come lo tratti, quanto costa con l&apos;IVA. Aprila per cambiare scelta, mettere un preventivo
                  o leggere su cosa è calcolata. I costi sono medie di fascia per Milano, non preventivi. «Già fatto» toglie la voce dal
                  conto e la conta per lo stato atteso; «Non lo faccio» la toglie da entrambi.
                </p>
                {p.voci.map((v) => (
                  <Voce key={v.id} v={v} scelta={scelte[v.id]} onChange={(s) => setScelta(v.id, s)} />
                ))}
              </div>
            )}

            {p.nonQuantificato.length > 0 && (
              <div className="v-reno__nq">
                {p.nonQuantificato.map((t, n) => <p key={n} className="v-small v-measure">{t}</p>)}
              </div>
            )}

            {intento === "compro" ? (
              <div className="v-reno__intento">
                <p className="v-eyebrow">Esborso complessivo ipotizzato</p>
                <label className="v-field" style={{ marginTop: "var(--s-3)" }}>
                  <span className="v-field__lbl">Prezzo di acquisto ipotizzato</span>
                  <input className="v-input" type="number" inputMode="numeric" min={0} value={prezzoAcquisto || ""}
                         onChange={(e) => setPrezzoAcquisto(Math.max(0, Number(e.target.value) || 0))} />
                  <span className="v-field__hint">
                    {input.prezzoRichiesto ? `Parte dal prezzo richiesto, ${eur(input.prezzoRichiesto)} €${prezzoBox ? ` più il box a parte, ${eur(prezzoBox)} €` : ""}: ` : "Parte dal valore stimato: "}
                    metti quello che pensi di pagare, non è la stessa cosa.
                    {boxSenzaPrezzo ? " Il box venduto a parte non è compreso: il suo prezzo non è scritto e il suo valore stimato non lo sostituisce." : ""}
                  </span>
                </label>
                <div className="v-reno__lines" style={{ marginTop: "var(--s-4)" }}>
                  <div className="v-factor"><span className="v-factor__n">Acquisto ipotizzato</span><span className="v-factor__v">{eur(prezzoAcquisto)} €</span></div>
                  <div className="v-factor"><span className="v-factor__n">Lavori, IVA, tecnici e pratiche</span><span className="v-factor__v">{eur(p.costo)} €</span></div>
                  <div className="v-factor v-factor--total"><span className="v-factor__n">Totale dichiarato{boxSenzaPrezzo ? ", senza il box a parte" : ""}</span><span className="v-factor__v">{eur(prezzoAcquisto + p.costo)} €</span></div>
                </div>
                <p className="v-small v-measure" style={{ marginTop: "var(--s-3)" }}>
                  Non è il totale completo: mancano le imposte sull&apos;acquisto (registro o IVA), il notaio, l&apos;agenzia e gli eventuali
                  costi del mutuo, che dipendono dalla tua situazione. La detrazione ({eur(p.detrazione)} €) arriva dopo, in dieci anni.
                </p>
              </div>
            ) : (
              <div className="v-reno__intento">
                <p className="v-eyebrow">Conviene sistemarla prima di vendere?</p>
                <div className="v-reno__lines" style={{ marginTop: "var(--s-4)" }}>
                  <div className="v-factor"><span className="v-factor__n">Valore stimato oggi</span><span className="v-factor__v">{eur(p.valorePrima)} €</span></div>
                  <div className="v-factor"><span className="v-factor__n">Costo dei lavori, netto della detrazione</span><span className="v-factor__v neg">−{eur(p.costoNetto)} €</span></div>
                  <div className="v-factor"><span className="v-factor__n">Valore atteso dopo</span><span className="v-factor__v">{eur(p.valoreDopo)} €</span></div>
                  <div className="v-factor v-factor--total">
                    <span className="v-factor__n">Incremento di valore meno spesa</span>
                    <span className={"v-factor__v " + (p.margine >= 0 ? "pos" : "neg")}>{p.margine >= 0 ? "+" : "−"}{eur(Math.abs(p.margine))} €</span>
                  </div>
                </div>
                <p className="v-small v-measure" style={{ marginTop: "var(--s-3)" }}>
                  {p.margine >= 0
                    ? "Un segno positivo dice che, per il modello, i lavori si ripagano nel prezzo. Non è un guadagno garantito: "
                    : "Un segno negativo dice che, per il modello, i lavori non si ripagano nel prezzo. "}
                  la stima dopo i lavori ha la stessa incertezza di quella di oggi (±{pct(p.sigmaDopo, 1)}), il costo è una media di fascia,
                  e la detrazione la incassa chi paga i lavori, in dieci anni: se vendi prima, la parte residua passa a chi compra.
                </p>
              </div>
            )}

            <p className="v-caveat">
              Il costo dei lavori è una media della fascia di zona, non un preventivo: un preventivo vero cambia sensibilmente con il
              palazzo, il piano e gli accessi. L&apos;IVA al 10% vale sulla manodopera e, per infissi, caldaia e sanitari, solo fino al
              suo valore: il resto è al 22%, e un cantiere con molti infissi paga qualcosa in più.
            </p>
          </>
        ) : (
          <p className="v-reno__what">
            Scegli un pacchetto per vedere quanto costerebbe, quanto ne torna con le detrazioni e quanto varrebbe la casa dopo.
            Poi puoi personalizzare gli interventi uno a uno.
          </p>
        )}
      </div>

    </div>
  );
}

/** Una voce del catalogo con le sue quattro possibilita'. */
function Voce({ v, scelta, onChange }: {
  v: Prospetto["voci"][number];
  scelta: Scelte[string];
  onChange: (s: Scelte[string] | undefined) => void;
}) {
  const modo: Modo = scelta?.modo ?? v.modo;
  const cambiaModo = (m: Modo) => {
    if (m === "incluso") onChange(undefined);
    /* il preventivo parte vuoto: la cifra e' del fornitore, non nostra, e finche' manca la voce resta fuori dal conto */
    else if (m === "preventivo") onChange({ modo: m, preventivo: scelta?.preventivo, ivaInclusa: scelta?.ivaInclusa ?? false, soloMateriali: scelta?.soloMateriali ?? false });
    else onChange({ modo: m });
  };
  const nonPrevisto = v.stimato === null;
  const statoBreve = nonPrevisto && modo === "incluso" ? "non previsto da questo pacchetto" : MODI.find((m) => m.id === modo)!.breve;

  /* Una riga sola dice tutto: nome, stato, costo. Il resto — come trattarla, il preventivo,
     su cosa e' calcolata, cosa comprende — sta nel dettaglio della voce. */
  return (
    <details className={"v-intervento" + (v.imponibile === 0 && modo !== "incluso" ? " v-intervento--fuori" : "")}>
      <summary className="v-intervento__testa">
        <span className="v-intervento__nome">
          <b>{v.nome}</b>{v.necessaria && <span className="v-intervento__tag">serve per lo stato atteso</span>}
          <small>{statoBreve}{v.errore ? " · dato non valido" : ""}</small>
        </span>
        <span className={"v-factor__v" + (v.imponibile ? "" : " v-intervento__zero")}>{v.imponibile ? `${eur(v.imponibile + v.iva)} €` : "0 €"}</span>
      </summary>
      <p className="v-small">{v.base}{v.stimato !== null ? ` · stima Valmiro ${eur(v.stimato)} € IVA esclusa` : " · non previsto da questo pacchetto"}</p>
      <div className="v-intervento__modi" role="group" aria-label={`Come trattare ${v.nome}`}>
        {MODI.map((m) => (
          <button key={m.id} type="button" className="v-scenario v-scenario--sm" aria-pressed={modo === m.id}
                  disabled={m.id === "incluso" && nonPrevisto} onClick={() => cambiaModo(m.id)}>{m.t}</button>
        ))}
      </div>
      {modo === "preventivo" && (
        <div className="v-intervento__prev">
          <label className="v-field">
            <span className="v-field__lbl">Il tuo preventivo, in euro</span>
            <input className={"v-input" + (v.errore ? " v-input--errore" : "")} type="number" inputMode="numeric" min={0} placeholder="0"
                   aria-invalid={!!v.errore}
                   value={scelta?.preventivo === undefined || Number.isNaN(scelta.preventivo) ? "" : scelta.preventivo}
                   onChange={(e) => onChange({ ...(scelta as any), modo: "preventivo", preventivo: e.target.value === "" ? undefined : Number(e.target.value) })} />
            {v.errore && <span className="v-field__hint v-field__hint--errore" role="alert">{v.errore}</span>}
          </label>
          <label className="v-toggle">
            <span>Comprende l&apos;IVA<small>Se sì, la togliamo per contare i lavori al netto come le altre voci.</small></span>
            <input type="checkbox" checked={!!scelta?.ivaInclusa} onChange={(e) => onChange({ ...(scelta as any), modo: "preventivo", ivaInclusa: e.target.checked })} />
          </label>
          <label className="v-toggle">
            <span>Solo materiali, senza posa<small>Aggiungiamo la posa stimata da noi, la metà del costo di questa voce.</small></span>
            <input type="checkbox" checked={!!scelta?.soloMateriali} onChange={(e) => onChange({ ...(scelta as any), modo: "preventivo", soloMateriali: e.target.checked })} />
          </label>
        </div>
      )}
      {v.nota && <p className="v-small" style={{ marginTop: "var(--s-2)" }}>{v.nota}</p>}
      <p className="v-small v-measure"><b>Cosa comprende.</b> {v.cosa}</p>
    </details>
  );
}
