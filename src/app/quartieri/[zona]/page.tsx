import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/sistema/Header";
import Logo from "@/components/sistema/Logo";
import ZoneHistory from "@/components/sistema/ZoneHistory";
import { ZONE, SEMESTRE, FONTE, FASCIA_NOME, INDICE_ISTAT } from "@/lib/data";
import { LOCAZIONI, SEMESTRE_LOCAZIONI, andamento } from "@/lib/affitto";
import { eur, num, pct } from "@/lib/formato";
import type { FasceOmi, Tipo } from "@/lib/types";

/**
 * Una pagina per ognuna delle 42 zone OMI.
 *
 * Perche' esistono: le quotazioni ci sono gia' tutte in casa, e la domanda che
 * la gente scrive davvero non e' «valutazione immobiliare» ma «prezzi al mq
 * Isola Milano». Finora avevamo una sola pagina con quarantadue righe dentro:
 * una risposta che nessun motore di ricerca poteva far corrispondere a
 * nessuna di quelle domande.
 *
 * Cosa c'e' dentro: solo dati gia' pubblicati e gia' usati dal motore —
 * quotazioni per tipologia e stato, canoni di locazione, la serie dal 2014, il
 * rendimento lordo di zona. Nessun numero nuovo, nessuna stima inventata per
 * riempire la pagina. E in fondo, detto per esteso, cosa questa pagina *non*
 * puo' dire: dentro una zona OMI ci sono strade che valgono il quaranta per
 * cento l'una dell'altra, e una quotazione non e' un prezzo di compravendita.
 */

const nomeBreve = (d: string) => (d.includes("·") ? d.split("·").pop()!.trim() : d);
const fascie: [Tipo, string][] = [["civ", "Abitazioni civili"], ["sig", "Abitazioni signorili"], ["eco", "Abitazioni economiche"], ["vil", "Ville e villini"]];

export function generateStaticParams() {
  return Object.keys(ZONE).map((zona) => ({ zona: zona.toLowerCase() }));
}

function trova(param: string) {
  const id = Object.keys(ZONE).find((z) => z.toLowerCase() === param.toLowerCase());
  return id ? { id, z: ZONE[id] } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ zona: string }> }): Promise<Metadata> {
  const { zona } = await params;
  const t = trova(zona);
  if (!t) return { title: "Zona non trovata · Valmiro" };
  const f = t.z.civ.NORMALE || t.z.civ.OTTIMO;
  const alto = t.z.civ.OTTIMO?.[1] ?? f?.[1] ?? 0;
  const nome = nomeBreve(t.z.d);
  return {
    title: `Prezzi delle case a ${nome} (zona ${t.id}) · Valmiro`,
    description:
      `Quotazioni ufficiali OMI ${SEMESTRE} per la zona ${t.id} di Milano — ${t.z.d}: ` +
      `da ${eur((f?.[0] ?? 0) * INDICE_ISTAT)} a ${eur(alto * INDICE_ISTAT)} €/mq per le abitazioni civili, ` +
      `canoni di locazione, andamento dal 2014 e rendimento lordo di zona.`,
  };
}

function Righe({ t, banda }: { t: FasceOmi; banda?: boolean }) {
  const r = (nome: string, v?: [number, number]) =>
    v ? (
      <div className="v-factor" key={nome}>
        <span className="v-factor__n">{nome}</span>
        <span className="v-factor__v">
          {eur(v[0] * (banda ? 1 : INDICE_ISTAT))} – {eur(v[1] * (banda ? 1 : INDICE_ISTAT))} {banda ? "€/mq al mese" : "€/mq"}
        </span>
      </div>
    ) : null;
  return <>{r("Stato normale", t.NORMALE)}{r("Stato ottimo", t.OTTIMO)}</>;
}

export default async function Zona({ params }: { params: Promise<{ zona: string }> }) {
  const { zona } = await params;
  const t = trova(zona);
  if (!t) notFound();
  const { id, z } = t;
  const nome = nomeBreve(z.d);
  const fascia = FASCIA_NOME[z.f];
  const a = andamento(id);
  const loc = LOCAZIONI[id];
  const civ = z.civ.NORMALE || z.civ.OTTIMO;
  const quotate = fascie.filter(([k]) => z[k] && Object.keys(z[k]).length);

  /* Le altre zone della stessa fascia: servono a chi sta confrontando quartieri,
     e tengono il sito legato insieme invece di quarantadue pagine isolate. */
  const vicine = Object.entries(ZONE)
    .filter(([k, v]) => k !== id && v.f === z.f)
    .map(([k, v]) => ({ id: k, nome: nomeBreve(v.d), mq: ((v.civ.NORMALE || v.civ.OTTIMO)?.[0] ?? 0) * INDICE_ISTAT }))
    .sort((x, y) => Math.abs(x.mq - (civ?.[0] ?? 0) * INDICE_ISTAT) - Math.abs(y.mq - (civ?.[0] ?? 0) * INDICE_ISTAT))
    .slice(0, 6);

  return (
    <div className="v-page">
      <Header />
      <main className="v-fill">
        <article className="v-wrap v-section v-section--op v-narrow">
          <p className="v-eyebrow">Zona {id} · {fascia}</p>
          <h1 className="v-h1" style={{ marginTop: "var(--s-3)" }}>Prezzi delle case a {nome}</h1>
          <p className="v-lead v-measure" style={{ marginTop: "var(--s-5)" }}>
            {civ ? (
              <>
                Nella zona {id} di Milano — {z.d} — un&apos;abitazione civile è quotata dall&apos;Agenzia delle Entrate
                fra <b>{eur(civ[0] * INDICE_ISTAT)}</b> e <b>{eur((z.civ.OTTIMO?.[1] ?? civ[1]) * INDICE_ISTAT)} €/mq</b>.
                {a && !a.nuova && <> Dal {a.dal.slice(0, 4)} la zona è {a.variazione >= 0 ? "salita" : "scesa"} del {pct(Math.abs(a.variazione))}.</>}
              </>
            ) : (
              <>La zona {id} — {z.d} — non ha una quotazione per le abitazioni civili in questo semestre.</>
            )}
          </p>

          <div className="v-actions" style={{ marginTop: "var(--s-6)" }}>
            <Link className="v-btn v-btn--accent" href={`/valuta?zona=${id}`}>Valuta una casa in questa zona</Link>
          </div>

          <h2 style={{ marginTop: "var(--s-8)" }}>Le quotazioni, per tipologia</h2>
          <p className="v-body v-measure">
            Semestre {SEMESTRE}, aggiornate all&apos;indice Istat dei prezzi delle abitazioni. «Normale» e «ottimo»
            sono i due stati conservativi che l&apos;Agenzia quota: ogni casa reale sta fra i due, ed è questo che
            il motore di Valmiro calcola voce per voce.
          </p>
          {quotate.map(([k, nomeT]) => (
            <div key={k} style={{ marginTop: "var(--s-5)" }}>
              <h3 className="v-h3">{nomeT}</h3>
              <div className="v-factors"><Righe t={z[k]} /></div>
            </div>
          ))}
          {z.box ? (
            <p className="v-small" style={{ marginTop: "var(--s-4)" }}>
              Box e posti auto: {eur(z.box[0] * INDICE_ISTAT)} – {eur(z.box[1] * INDICE_ISTAT)} €/mq.
            </p>
          ) : null}

          {loc && (
            <>
              <h2 style={{ marginTop: "var(--s-8)" }}>Quanto si affitta</h2>
              <p className="v-body v-measure">
                Canoni OMI {SEMESTRE_LOCAZIONI} per le abitazioni civili della zona.
                {a && Number.isFinite(a.rendimentoZona) && <> Rapportati alle quotazioni di vendita, danno un rendimento lordo di zona del <b>{pct(a.rendimentoZona, 1)}</b>: è il canone annuo diviso il prezzo, senza IMU, spese e sfitto.</>}
              </p>
              <div className="v-factors" style={{ marginTop: "var(--s-4)" }}><Righe t={loc.civ} banda /></div>
            </>
          )}

          {a && (
            <>
              <h2 style={{ marginTop: "var(--s-8)" }}>La zona dal {a.dal.slice(0, 4)}</h2>
              <ZoneHistory a={a} zona={id} />
            </>
          )}

          <h2 style={{ marginTop: "var(--s-8)" }}>Cosa questa pagina non dice</h2>
          <p className="v-body v-measure">
            Una zona OMI è grande: dentro {id} ci sono strade che valgono molto diversamente fra loro, e il
            palazzo, il piano, la vista e lo stato spostano il prezzo più di quanto lo sposti il quartiere. Le
            quotazioni sono <b>forbici di zona</b>, non prezzi di singole case, e non sono prezzi di
            compravendita: sono l&apos;osservazione che l&apos;Agenzia pubblica per un&apos;area intera. Per un numero
            riferito a una casa precisa serve la stima, che parte da qui e poi applica i coefficienti uno per uno,
            mostrandoli.
          </p>

          {vicine.length > 0 && (
            <>
              <h2 style={{ marginTop: "var(--s-8)" }}>Zone simili</h2>
              <div className="v-factors">
                {vicine.map((v) => (
                  <Link className="v-factor" key={v.id} href={`/quartieri/${v.id.toLowerCase()}`} style={{ textDecoration: "none" }}>
                    <span className="v-factor__n">{v.nome} <small style={{ color: "var(--ink-faint)" }}>· {v.id}</small></span>
                    <span className="v-factor__v">da {eur(v.mq)} €/mq</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <p style={{ marginTop: "var(--s-8)" }}>
            <Link className="v-btn v-btn--accent" href={`/valuta?zona=${id}`}>Valuta una casa a {nome}</Link>
            {" "}
            <Link className="v-btn v-btn--bare" href="/quartieri">Tutte le {Object.keys(ZONE).length} zone</Link>
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
