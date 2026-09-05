"use client";
import { useState } from "react";
import { eur, num, pct } from "@/lib/formato";
import { IPOTESI_BREVE_BASE, affittoBreve, tariffaPrudente, type IpotesiBreve, type Rendita } from "@/lib/affitto";
import type { Stima } from "@/lib/types";

/**
 * Affitto breve contro 4+4. Le ipotesi stanno in vista e si muovono: e' uno
 * scenario, e la pagina lo tratta come tale. Il numero che conta e' il
 * pareggio: l'occupazione sotto la quale conviene il contratto lungo.
 */
export default function ShortRent({ lungo, stima }: { lungo: Rendita; stima: Stima }) {
  const [ip, setIp] = useState<IpotesiBreve>({ ...IPOTESI_BREVE_BASE, tariffa: tariffaPrudente(lungo.canoneMese) });
  const set = (p: Partial<IpotesiBreve>) => setIp((v) => ({ ...v, ...p }));
  const b = affittoBreve(ip, lungo, stima);
  const meglio = b.differenza >= 0;

  return (
    <div className="v-short">
      <div className="v-short__ipotesi">
        <label className="v-slider">
          <span>Tariffa a notte <b>{eur(ip.tariffa)} €</b></span>
          <input type="range" min={50} max={400} step={5} value={ip.tariffa} onChange={(e) => set({ tariffa: Number(e.target.value) })} />
          <small>Prudente: un nono del canone mensile. Il mercato milanese sta a 150–160 € in media, di più in centro.</small>
        </label>
        <label className="v-slider">
          <span>Occupazione <b>{pct(ip.occupazione)} · {num(b.notti)} notti l&apos;anno</b></span>
          <input type="range" min={0.2} max={0.9} step={0.05} value={ip.occupazione} onChange={(e) => set({ occupazione: Number(e.target.value) })} />
          <small>Le fonti di settore danno 55–65% a Milano, oltre 70% nelle zone più richieste.</small>
        </label>
        <label className="v-toggle">
          <span>Affidi la gestione a un property manager<small>Circa il 22% del lordo. Senza, fai tu check-in, pulizie e messaggi.</small></span>
          <input type="checkbox" checked={ip.gestione > 0} onChange={(e) => set({ gestione: e.target.checked ? 0.22 : 0 })} />
        </label>
        <label className="v-toggle">
          <span>È dal secondo immobile che affitti così<small>La cedolare sale dal 21% al 26%; oltre quattro immobili è un&apos;impresa.</small></span>
          <input type="checkbox" checked={ip.cedolare > 0.21} onChange={(e) => set({ cedolare: e.target.checked ? 0.26 : 0.21 })} />
        </label>
      </div>

      <div>
        <dl className="v-facts v-facts--tight" style={{ marginTop: 0 }}>
          <div className="v-fact">
            <dt>Netto affitto breve</dt>
            <dd>{eur(b.netto)} €</dd>
          </div>
          <div className="v-fact">
            <dt>Netto 4+4</dt>
            <dd>{eur(lungo.annuoNetto)} €</dd>
          </div>
          <div className="v-fact">
            <dt>Pareggio</dt>
            <dd>{b.pareggio === null ? "mai" : pct(b.pareggio)}</dd>
          </div>
        </dl>

        <p className="v-history__lead" style={{ marginTop: "var(--s-5)" }}>
          <b className={meglio ? "pos" : "neg"}>{meglio ? "+" : "−"}{eur(Math.abs(b.differenza))} €</b>
          l&apos;anno {meglio ? "in più" : "in meno"} del 4+4, con queste ipotesi
        </p>

        <div className="v-reno__lines" style={{ marginTop: "var(--s-4)" }}>
          <div className="v-factor"><span className="v-factor__n">Incasso lordo · {num(b.notti)} notti</span><span className="v-factor__v">{eur(b.lordo)} €</span></div>
          <div className="v-factor"><span className="v-factor__n">Commissioni delle piattaforme {pct(ip.commissioni)}</span><span className="v-factor__v neg">−{eur(b.commissioni)} €</span></div>
          <div className="v-factor"><span className="v-factor__n">Pulizie · {eur(ip.pulizie)} € a cambio, soggiorni da {ip.soggiorno} notti</span><span className="v-factor__v neg">−{eur(b.pulizie)} €</span></div>
          <div className="v-factor"><span className="v-factor__n">Utenze e condominio, che nel 4+4 paga l&apos;inquilino</span><span className="v-factor__v neg">−{eur(b.utenze)} €</span></div>
          {b.gestione > 0 && <div className="v-factor"><span className="v-factor__n">Property manager {pct(ip.gestione)}</span><span className="v-factor__v neg">−{eur(b.gestione)} €</span></div>}
          <div className="v-factor"><span className="v-factor__n">Cedolare secca {pct(ip.cedolare)} sul lordo</span><span className="v-factor__v neg">−{eur(b.cedolare)} €</span></div>
          <div className="v-factor v-factor--total"><span className="v-factor__n">Netto</span><span className="v-factor__v">{eur(b.netto)} €</span></div>
        </div>

        <p className="v-caveat">
          {b.pareggio === null
            ? "Con queste ipotesi l'affitto breve non raggiunge il 4+4 nemmeno a occupazione piena."
            : `Sotto il ${pct(b.pareggio)} di occupazione conviene il contratto lungo.`}{" "}
          Nessun dato ufficiale copre le tariffe a notte: tariffa, occupazione e costi sono ipotesi di settore
          (AirDNA, luglio 2026) e vanno adattate alla casa. Mancano il tempo che ci metti, i periodi di fermo, l&apos;usura
          più rapida. Obblighi: CIN esposto, documenti degli ospiti alla Questura entro 24 ore, imposta di soggiorno
          riscossa e versata al Comune, e da quest&apos;anno limiti alle cassette delle chiavi per il self check-in.
        </p>
      </div>
    </div>
  );
}
