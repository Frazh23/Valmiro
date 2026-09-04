"use client";
import { ZONE, INDICE_ISTAT, FASCIA_NOME } from "@/lib/data";
import { eur } from "@/lib/formato";
import type { Tipo } from "@/lib/types";

/**
 * Dove cade questo immobile dentro la forbice ufficiale della sua zona.
 * Le due fasce OMI (NORMALE e OTTIMO) diventano l'asse; il perno e' l'euro/mq
 * calcolato dal motore. Nessun nuovo calcolo: solo posizionamento visuale.
 */
export default function MarketRange({ zona, tipo, euroMq }: { zona: string; tipo: Tipo; euroMq: number }) {
  const z = ZONE[zona];
  if (!z) return null;

  const fasce = (z[tipo] && Object.keys(z[tipo]).length ? z[tipo] : z.civ) as {
    NORMALE?: [number, number]; OTTIMO?: [number, number];
  };
  /* L'indice Istat porta la base OMI, pubblicata con mesi di ritardo, al presente:
     lo stesso fattore che applica il motore, cosi' asse e perno sono confrontabili. */
  const grezzoLo = fasce.NORMALE?.[0] ?? fasce.OTTIMO![0];
  const grezzoHi = fasce.OTTIMO?.[1] ?? fasce.NORMALE![1];
  const lo = grezzoLo * INDICE_ISTAT;
  const hi = grezzoHi * INDICE_ISTAT;
  const nLo = (fasce.NORMALE?.[0] ?? grezzoLo) * INDICE_ISTAT;
  const nHi = (fasce.NORMALE?.[1] ?? grezzoHi) * INDICE_ISTAT;

  const q = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100));
  const perno = q(euroMq);
  const fuori = euroMq < lo || euroMq > hi;

  return (
    <div className="v-range">
      <div className="v-range__track">
        <div className="v-range__band" style={{ left: `${q(nLo)}%`, width: `${q(nHi) - q(nLo)}%` }} />
        <div className="v-range__pin" style={{ left: `${perno}%` }} aria-hidden="true" />
      </div>
      <div className="v-range__scale">
        <span>{eur(lo)} €/mq</span>
        <span>{eur(hi)} €/mq</span>
      </div>
      <p className="v-body" style={{ marginTop: "var(--s-5)", maxWidth: "46ch" }}>
        La zona <b>{zona}</b> — {z.d} — è quotata fra {eur(lo)} e {eur(hi)} €/mq
        ({FASCIA_NOME[z.f]?.toLowerCase()}). La fascia evidenziata è lo stato conservativo normale.
        Questo immobile si colloca a <b>{eur(euroMq)} €/mq</b>
        {fuori ? ", fuori dalla forbice pubblicata: sono le caratteristiche a spostarlo" : ""}.
      </p>
    </div>
  );
}
