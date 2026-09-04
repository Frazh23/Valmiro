/** Formattatori condivisi. Unico posto in cui si decide come si scrive un numero. */

/* In italiano il raggruppamento predefinito e' "min2": 5171 uscirebbe senza punto
   e 414000 con. Due formati diversi nella stessa schermata sono un errore, non
   una convenzione: imponiamo il separatore sempre. */
const NF = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" });

export const eur = (n: number) => NF.format(Math.round(n));
export const num = (n: number, dec = 0) =>
  new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: "always",
  }).format(n);

/** 438000 -> "438 mila", 1250000 -> "1,25 mln". Per le sintesi, non per i totali. */
export function eurBreve(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${num(n / 1_000_000, 2)} mln`;
  if (Math.abs(n) >= 1_000) return `${num(n / 1_000)} mila`;
  return eur(n);
}

export const pct = (x: number, dec = 0) => `${num(x * 100, dec)}%`;
