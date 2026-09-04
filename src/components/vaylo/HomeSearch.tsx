"use client";
import { useRouter } from "next/navigation";
import AddressSearch from "./AddressSearch";
import type { Scelta } from "@/lib/types";

/** Porta l'indirizzo scelto nel flusso di valutazione. Nessuno stato globale: i
 *  parametri viaggiano nell'URL, cosi' una valutazione e' condivisibile e ricaricabile. */
export default function HomeSearch() {
  const router = useRouter();
  const vai = (s: Scelta) => {
    const p = new URLSearchParams({ zona: s.zona, ind: s.etichetta, desc: s.descrizione });
    if (s.preciso) p.set("p", "1");
    router.push(`/valuta?${p}`);
  };
  return <AddressSearch onScegli={vai} azione="Valuta ora" />;
}
