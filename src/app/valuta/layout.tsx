import type { Metadata } from "next";

/* La pagina della valutazione e' un componente client (legge i parametri
   dell'indirizzo e tiene lo stato del modulo), e un componente client non puo'
   esportare i metadati: senza questo layout ereditava titolo e descrizione
   generici del sito proprio la pagina che conta di piu'. */
export const metadata: Metadata = {
  title: "Valuta una casa a Milano · Valmiro",
  description:
    "Stima gratuita del valore di una casa a Milano sulle quotazioni ufficiali OMI dell'Agenzia delle Entrate: il calcolo voce per voce, i costi di ristrutturazione, quanto renderebbe affittata.",
};

export default function LayoutValuta({ children }: { children: React.ReactNode }) {
  return children;
}
