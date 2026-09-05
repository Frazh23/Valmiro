import type { Tipo } from "./types";

/* --------------------------------------------------------------------------
   Categoria catastale -> tipologia OMI.

   L'OMI quota quattro tipologie (civile, signorile, economico, ville) e la
   scelta sposta il valore anche di un quinto in centro: lasciarla a occhio era
   il punto piu' debole del modulo. Il catasto ha gia' la risposta: la categoria
   sta su ogni visura e in ogni rogito. Non e' interrogabile per indirizzo senza
   gli identificativi catastali, quindi la chiediamo a chi la casa la possiede.
   -------------------------------------------------------------------------- */

export type Categoria = "A/1" | "A/2" | "A/3" | "A/4" | "A/5" | "A/6" | "A/7" | "A/8" | "A/9" | "A/11";

export const CATEGORIE: { id: Categoria; nome: string; tipo: Tipo; nota: string }[] = [
  { id: "A/2", nome: "Abitazione di tipo civile", tipo: "civ", nota: "la piu' comune: la gran parte degli appartamenti milanesi" },
  { id: "A/3", nome: "Abitazione di tipo economico", tipo: "eco", nota: "finiture e impianti di livello ordinario, spesso edilizia anni '50-'70" },
  { id: "A/1", nome: "Abitazione di tipo signorile", tipo: "sig", nota: "palazzi d'epoca e residenze di pregio: cambia molto la stima" },
  { id: "A/4", nome: "Abitazione di tipo popolare", tipo: "eco", nota: "edilizia economico-popolare" },
  { id: "A/7", nome: "Villino", tipo: "vil", nota: "casa singola o a schiera con giardino" },
  { id: "A/8", nome: "Villa", tipo: "vil", nota: "con parco o giardino, in zona residenziale" },
  { id: "A/5", nome: "Abitazione ultrapopolare", tipo: "eco", nota: "categoria storica, quasi sparita" },
  { id: "A/6", nome: "Abitazione rurale", tipo: "eco", nota: "rara in citta'" },
  { id: "A/9", nome: "Castelli e palazzi di pregio", tipo: "sig", nota: "rarissima" },
  { id: "A/11", nome: "Alloggio tipico dei luoghi", tipo: "eco", nota: "rarissima" },
];

export function tipoDaCategoria(c: Categoria | null | undefined): Tipo | null {
  return CATEGORIE.find((x) => x.id === c)?.tipo ?? null;
}

/** Accetta "A2", "a/2", "A 2", "A02": la gente la copia come la trova. */
export function normalizzaCategoria(s: string): Categoria | null {
  const m = s.toUpperCase().replace(/\s+/g, "").match(/^A\/?0?(\d{1,2})$/);
  if (!m) return null;
  const id = `A/${parseInt(m[1], 10)}` as Categoria;
  return CATEGORIE.some((c) => c.id === id) ? id : null;
}
