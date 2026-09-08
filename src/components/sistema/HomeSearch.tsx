"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddressSearch from "./AddressSearch";
import type { Intento, Scelta } from "@/lib/types";

/**
 * Porta intento e indirizzo nel flusso di valutazione. Nessuno stato globale: i
 * parametri viaggiano nell'URL, cosi' una valutazione e' condivisibile e ricaricabile.
 * Chi sceglie da che parte sta e basta va a /valuta con l'intento; chi scrive
 * l'indirizzo senza scegliere lo sceglie li', prima di tutto il resto.
 * Chi compra ha quasi sempre un annuncio davanti: appena sceglie «Voglio comprare»,
 * accanto all'indirizzo compare la via breve, incollare il testo.
 */
export default function HomeSearch() {
  const router = useRouter();
  const [intento, setIntento] = useState<Intento | null>(null);
  const vai = (s: Scelta) => {
    const p = new URLSearchParams({ zona: s.zona, ind: s.etichetta, desc: s.descrizione, f: s.fonte });
    if (intento) p.set("i", intento);
    router.push(`/valuta?${p}`);
  };
  return (
    <>
      <div className="v-hero__intento" role="group" aria-label="Cosa vuoi fare">
        <button type="button" className="v-scenario" aria-pressed={intento === "compro"} onClick={() => setIntento("compro")}>Voglio comprare</button>
        <button type="button" className="v-scenario" aria-pressed={intento === "vendo"} onClick={() => setIntento("vendo")}>Voglio vendere</button>
      </div>
      <AddressSearch onScegli={vai} azione="Valuta ora" />
      {/* La riga occupa il suo spazio sempre, anche quando non ha niente da dire.
          Se comparisse e sparisse, la colonna cambierebbe altezza di una
          sessantina di pixel, e con lei l'eroe e la fotografia che lo riempie:
          a ogni clic su «comprare» o «vendere» la foto sembrerebbe cambiare
          misura. Quando e' muta e' anche inerte — niente link da raggiungere
          col tabulatore, niente da leggere per uno screen reader. */}
      <p className="v-hero__incolla" aria-hidden={intento !== "compro"}
         style={intento === "compro" ? undefined : { visibility: "hidden" }}>
        Hai l&apos;annuncio davanti?{" "}
        {intento === "compro"
          ? <Link href="/valuta?i=compro&incolla=1" className="v-link">Incolla il testo dell&apos;annuncio</Link>
          : <span className="v-link">Incolla il testo dell&apos;annuncio</span>}
        {" "}e leggiamo noi indirizzo, metri, piano e prezzo.
      </p>
    </>
  );
}
