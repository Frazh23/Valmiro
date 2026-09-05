"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AddressSearch from "./AddressSearch";
import type { Intento, Scelta } from "@/lib/types";

/**
 * Porta intento e indirizzo nel flusso di valutazione. Nessuno stato globale: i
 * parametri viaggiano nell'URL, cosi' una valutazione e' condivisibile e ricaricabile.
 * Chi sceglie da che parte sta e basta va a /valuta con l'intento; chi scrive
 * l'indirizzo senza scegliere lo sceglie li', prima di tutto il resto.
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
        <button className="v-scenario" aria-pressed={intento === "compro"} onClick={() => setIntento("compro")}>Voglio comprare</button>
        <button className="v-scenario" aria-pressed={intento === "vendo"} onClick={() => setIntento("vendo")}>Voglio vendere</button>
      </div>
      <AddressSearch onScegli={vai} azione="Valuta ora" />
    </>
  );
}
