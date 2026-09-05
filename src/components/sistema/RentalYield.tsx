"use client";
import { eur, num, pct } from "@/lib/formato";
import { FISCO_AFFITTO, SEMESTRE_LOCAZIONI, type Rendita } from "@/lib/affitto";

/**
 * "Se la affitti": il canone che i dati ufficiali suggeriscono per questa casa,
 * e cosa ne resta. Un numero grande, tre fatti, e le ipotesi dette per esteso:
 * chi legge deve poter rifare il conto a mano.
 */
export default function RentalYield({ r, zona }: { r: Rendita; zona: string }) {
  return (
    <div className="v-rent">
      <div className="v-rent__main">
        <p className="v-eyebrow">Canone mensile indicativo</p>
        <p className="v-value v-value--sm">
          <span className="v-value__cur">€</span>{eur(r.canoneMese)}
        </p>
        <p className="v-small">
          {num(r.euroMqMese, 1)} €/mq al mese · in zona {zona} l&apos;OMI quota da {num(r.banda[0], 1)} a {num(r.banda[1], 1)} €/mq
        </p>
      </div>

      <dl className="v-facts v-facts--tight">
        <div className="v-fact">
          <dt>Rendimento lordo</dt>
          <dd>{pct(r.lordo, 1)}</dd>
        </div>
        <div className="v-fact">
          <dt>Netto da cedolare e sfitto</dt>
          <dd>{pct(r.netto, 1)}</dd>
        </div>
        <div className="v-fact">
          <dt>Si ripaga in</dt>
          <dd>{num(r.anniRipago)} anni</dd>
        </div>
      </dl>

      <p className="v-body v-measure" style={{ marginTop: "var(--s-6)" }}>
        Con un contratto libero 4+4 il canone rende <b>{eur(r.annuoLordo)} €</b> l&apos;anno.
        Tolta la cedolare secca al {pct(FISCO_AFFITTO.cedolare)} e {FISCO_AFFITTO.mesiSfitto === 1 ? "un mese" : `${FISCO_AFFITTO.mesiSfitto} mesi`} di
        sfitto all&apos;anno restano <b>{eur(r.annuoNetto)} €</b>. Mancano l&apos;IMU, che dipende dalla rendita
        catastale, e le spese straordinarie del condominio.
      </p>
      <p className="v-small v-measure" style={{ marginTop: "var(--s-4)" }}>
        Con il canone concordato (3+2) la cedolare scende al 10%, ma il canone lo fissa l&apos;accordo territoriale
        di Milano, di solito sotto il mercato: non lo calcoliamo. Canoni OMI {SEMESTRE_LOCAZIONI}, non aggiornati
        {r.ripiego ? "; per questa tipologia la zona non ha canoni propri, usiamo quelli delle abitazioni civili" : ""}.
      </p>
    </div>
  );
}
