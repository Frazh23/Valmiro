/** Formattatori condivisi. Unico posto in cui si decide come si scrive un numero. */

const NF = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });

export const eur = (n: number) => NF.format(Math.round(n));
export const num = (n: number, dec = 0) =>
  new Intl.NumberFormat("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

/** 438000 -> "438 mila", 1250000 -> "1,25 mln". Per le sintesi, non per i totali. */
export function eurBreve(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${num(n / 1_000_000, 2)} mln`;
  if (Math.abs(n) >= 1_000) return `${num(n / 1_000)} mila`;
  return eur(n);
}

export const pct = (x: number, dec = 0) => `${num(x * 100, dec)}%`;
