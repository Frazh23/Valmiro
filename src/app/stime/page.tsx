"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/sistema/Header";
import Logo from "@/components/sistema/Logo";
import { leggiStime, eliminaStima, leggiStimeAccount, eliminaStimaAccount, migraStimeLocali, type StimaSalvata } from "@/lib/storage";
import { useSessione } from "@/lib/sessione";
import { eur, num } from "@/lib/formato";
import { FONTE } from "@/lib/data";

const ATTESA_ANNULLA = 7000;

/**
 * Le stime salvate, nel linguaggio del resto del sito. Ogni scheda si riapre con
 * i dati e il risultato di allora («Apri stima»); «Elimina» e' secondario e si
 * puo' annullare per qualche secondo prima che la cancellazione avvenga davvero.
 */
export default function Stime() {
  const { utente, pronto } = useSessione();
  const [stime, setStime] = useState<StimaSalvata[] | null>(null);
  const [daMigrare, setDaMigrare] = useState(0);
  /* eliminazioni in attesa: la scheda sparisce subito, il dato dopo, salvo «Annulla» */
  const [inAttesa, setInAttesa] = useState<StimaSalvata | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ricarica = async () => setStime(utente ? await leggiStimeAccount() : leggiStime());

  useEffect(() => {
    if (!pronto) return;
    ricarica();
    setDaMigrare(utente ? leggiStime().length : 0);
  }, [pronto, utente]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function elimina(s: StimaSalvata) {
    if (inAttesa) conferma(inAttesa); /* una sola in attesa per volta: la precedente si chiude */
    setStime((v) => (v || []).filter((x) => x.id !== s.id));
    setInAttesa(s);
    timer.current = setTimeout(() => conferma(s), ATTESA_ANNULLA);
  }
  async function conferma(s: StimaSalvata) {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setInAttesa((v) => (v?.id === s.id ? null : v));
    if (utente) await eliminaStimaAccount(s.id); else eliminaStima(s.id);
  }
  function annulla() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setInAttesa(null);
    ricarica();
  }

  return (
    <div className="v-page">
      <Header />
      <main className="v-fill">
        <section className="v-wrap v-section v-section--op">
          <p className="v-eyebrow">Le tue valutazioni</p>
          <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Le mie stime</h1>
          <p className="v-lead v-measure" style={{ marginTop: "var(--s-4)" }}>
            {utente
              ? "Salvate nel tuo account: le ritrovi da qualsiasi dispositivo, e le vedi solo tu."
              : "Restano su questo browser. Con un account le ritrovi ovunque."}
          </p>

          {daMigrare > 0 && (
            <div className="v-note" style={{ marginTop: "var(--s-6)" }}>
              Su questo browser ci sono {daMigrare} stime fatte prima di entrare. Portale nell&apos;account così non le perdi cambiando dispositivo.
              <div className="v-actions" style={{ marginTop: "var(--s-3)" }}>
                <button type="button" className="v-btn v-btn--quiet v-btn--xs"
                  onClick={async () => { await migraStimeLocali(utente!.id); setDaMigrare(0); ricarica(); }}>
                  Portale nell&apos;account
                </button>
              </div>
            </div>
          )}

          {inAttesa && (
            <div className="v-note v-annulla" role="status">
              <span>Stima di <b>{inAttesa.indirizzo}</b> eliminata.</span>
              <button type="button" className="v-btn v-btn--quiet v-btn--xs" onClick={annulla}>Annulla</button>
            </div>
          )}

          {stime === null ? null : stime.length === 0 ? (
            <div className="v-card v-card--vuota">
              <p className="v-body">Non hai ancora fatto nessuna stima.</p>
              <Link href="/valuta" className="v-btn v-btn--accent">Valuta una casa</Link>
            </div>
          ) : (
            <ul className="v-schede" aria-label="Stime salvate">
              {stime.map((s) => {
                const scenario = !!s.stima.simulazione || !!s.stima.ipotesi?.length;
                return (
                  <li className="v-scheda" key={s.id}>
                    <div className="v-scheda__testa">
                      <div className="v-scheda__chi">
                        <p className="v-eyebrow">
                          {s.input.intento === "compro" ? "Da comprare" : s.input.intento === "vendo" ? "Da vendere" : "Stima"}
                          {" · "}{new Date(s.creataIl).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <h2 className="v-h3" style={{ marginTop: "var(--s-2)" }}>{s.indirizzo}</h2>
                        <p className="v-small" style={{ marginTop: "var(--s-1)" }}>
                          Zona {s.zona}{s.descrizioneZona ? ` · ${s.descrizioneZona}` : ""} · {num(s.input.mq)} mq
                          {s.input.boxSeparato?.incluso ? " · box venduto a parte incluso" : ""}
                        </p>
                      </div>
                      <div className="v-scheda__valore">
                        <span className="v-scheda__num">{eur(s.stima.centro)} €</span>
                        <span className="v-small">{eur(s.stima.min)} – {eur(s.stima.max)} € · {eur(s.stima.euroMq)} €/mq</span>
                        <span className="v-small">{scenario ? "simulazione, non una valutazione" : `affidabilità ${s.stima.affidabilita.toLowerCase()}`}</span>
                      </div>
                    </div>
                    {s.stima.simulazione && (
                      <p className="v-scheda__avviso">
                        Simulazione che ipotizza un piano terra: il piano dichiarato è {s.stima.simulazione.pianoDichiarato}, per cui il modello non ha un
                        trattamento validato. Non è una valutazione di quel piano.
                      </p>
                    )}
                    {s.stima.ipotesi && s.stima.ipotesi.length > 0 && (
                      <p className="v-scheda__avviso">
                        Simulazione con dati incompleti: {s.stima.ipotesi.map((x) => x.split(" — ")[0]).join("; ")}. Ipotesi, non fatti.
                      </p>
                    )}
                    <div className="v-scheda__azioni">
                      <Link className="v-btn v-btn--quiet v-btn--xs" href={`/valuta?stima=${encodeURIComponent(s.id)}`}>Apri stima</Link>
                      <button type="button" className="v-btn v-btn--bare v-btn--xs" onClick={() => elimina(s)}>Elimina</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
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
