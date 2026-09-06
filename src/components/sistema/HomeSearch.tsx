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
      {intento === "compro" && (
        <p className="v-hero__incolla">
          Hai l&apos;annuncio davanti?{" "}
          <Link href="/valuta?i=compro&incolla=1" className="v-link">Incolla il testo dell&apos;annuncio</Link>
          {" "}e leggiamo noi indirizzo, metri, piano e prezzo.
        </p>
      )}
    </>
  );
}
