import type { Classe, Piano, Stato } from "./types";

/* --------------------------------------------------------------------------
   Leggere il testo di un annuncio.

   Il link non si puo' seguire: leggere un portale in automatico e' vietato dai
   suoi termini e dalla tutela delle banche dati. Il testo che una persona
   copia e incolla, invece, e' suo da usare. Qui lo si legge con espressioni
   regolari, non con un modello: e' prevedibile, gira nel browser, non manda
   il testo da nessuna parte, e quando non capisce lo dice.

   Ogni campo trovato e' un suggerimento da controllare, mai una verita':
   il modulo lo mostra precompilato e chi legge conferma.
   -------------------------------------------------------------------------- */

export type Letto = {
  indirizzo?: string;
  mq?: number;
  piano?: Piano;
  ascensore?: boolean;
  stato?: Stato;
  classe?: Classe;
  /** quanti balconi dichiara l'annuncio (presenza, non metri) */
  balconi?: number;
  /** superficie dei balconi, solo se l'annuncio la scrive */
  mqBalconi?: number;
  /** l'annuncio nomina un terrazzo */
  terrazzo?: boolean;
  /** superficie del terrazzo, solo se l'annuncio la scrive */
  mqTerrazzi?: number;
  cantina?: boolean;
  box?: "nessuno" | "posto" | "box";
  prezzo?: number;
  /** cosa e' stato riconosciuto, in parole, per dirlo a chi legge */
  trovati: string[];
};

const VIE = "via|viale|piazza|piazzale|corso|largo|alzaia|bastioni|foro|galleria|ripa|vicolo|passaggio|cascina";

const numero = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

export function leggiAnnuncio(testo: string): Letto {
  const t = testo.replace(/\s+/g, " ").trim();
  const l = t.toLowerCase();
  const out: Letto = { trovati: [] };

  // ---- indirizzo: la prima via con eventuale civico, senza il resto della frase
  const via = t.match(new RegExp(`\\b(${VIE})\\s+((?:[A-ZÀ-Ý][\\wÀ-ÿ'’.]*|d[aeio]l?l?[aeo']?|de[il]|degli|delle|San|Santa|Sant')(?:\\s+(?:[A-ZÀ-Ý][\\wÀ-ÿ'’.]*|d[aeio]l?l?[aeo']?|de[il]|degli|delle))*)(?:,?\\s*(?:n\\.?\\s*)?(\\d{1,3}(?:\\s*\\/?\\s*[A-Za-z](?![\\wÀ-ÿ²]))?)(?!\\d)(?!\\s*(?:m²|mq|m2|metri|locali|€)))?`, "i"));
  if (via) {
    const nome = `${via[1]} ${via[2]}`.replace(/\s+/g, " ").trim();
    out.indirizzo = via[3] ? `${nome} ${via[3].replace(/\s+/g, "")}` : nome;
    out.trovati.push(out.indirizzo);
  }

  // ---- superficie: la piu' grande fra quelle scritte in metri quadri, sotto i 1000,
  //      escluse quelle che parlano di una pertinenza ("terrazzo 30 mq" non e' la casa)
  const PERTINENZA = /balcon|terrazz|giardin|cantina|box|soffitt|solaio|posto auto|loggia/;
  const mq = [...l.matchAll(/(\d{2,4}(?:[.,]\d)?)\s*(?:m²|mq|m2|metri quadr)/g)]
    .filter((m) => !PERTINENZA.test(l.slice(Math.max(0, m.index! - 28), m.index!)) && !/^\s*(?:quadr\w*\s*)?di\s*(?:balcon|terrazz|giardin|cantina)/.test(l.slice(m.index! + m[0].length, m.index! + m[0].length + 24)))
    .map((m) => numero(m[1])).filter((n) => n >= 15 && n < 1000);
  const sup = l.match(/superficie[^0-9]{0,25}(\d{2,4})/);
  if (sup && Number(sup[1]) >= 15 && Number(sup[1]) < 1000) out.mq = Number(sup[1]);
  else if (mq.length) out.mq = Math.max(...mq);
  if (out.mq) out.trovati.push(`${out.mq} mq`);

  // ---- piano
  if (/\battico\b|ultimo piano/.test(l)) out.piano = "ultimo";
  else if (/piano\s+rialzato|\brialzato\b/.test(l)) out.piano = "rialzato";
  else if (/piano\s+terra|\bpianterreno\b|\bpiano\s+t\b/.test(l)) out.piano = "terra";
  else {
    const p = l.match(/(\d{1,2})\s*[°ºo]?\s*piano/) || l.match(/piano\s*:?\s*(\d{1,2})\b/);
    if (p) {
      const n = Number(p[1]);
      out.piano = n === 0 ? "terra" : n <= 2 ? "1-2" : n <= 5 ? "3-5" : "6+";
    }
  }
  if (out.piano) out.trovati.push(`piano ${out.piano}`);

  // ---- ascensore
  if (/senza ascensore|no ascensore|ascensore\s*:\s*no|ascensore assente/.test(l)) { out.ascensore = false; out.trovati.push("senza ascensore"); }
  else if (/ascensore/.test(l)) { out.ascensore = true; out.trovati.push("ascensore"); }

  // ---- stato di conservazione
  if (/da ristrutturare|da rimodernare|da sistemare|da rinnovare/.test(l)) out.stato = "rist";
  else if (/nuova costruzione|in costruzione|mai abitat|di nuova realizzazione|\bnuovo\b.{0,20}\bconsegna|classe a\d?\b.{0,40}nuov/.test(l)) out.stato = "nuov";
  else if (/ristrutturat|rinnovat|ottimo stato|ottime condizioni|perfette condizioni|finemente/.test(l)) out.stato = "otti";
  else if (/buono stato|buone condizioni|abitabile|discret/.test(l)) out.stato = "abit";
  if (out.stato) out.trovati.push({ rist: "da ristrutturare", abit: "abitabile", otti: "ristrutturata", nuov: "nuova" }[out.stato]);

  // ---- classe energetica: "classe energetica D", "classe: A4", "APE: G"
  const cl = l.match(/classe\s*(?:energetica)?\s*[:\-]?\s*([a-g])(?:\d)?\b/) || l.match(/\bape\s*[:\-]?\s*([a-g])(?:\d)?\b/);
  if (cl) { out.classe = cl[1].toUpperCase() as Classe; out.trovati.push(`classe ${out.classe}`); }

  // ---- balconi e terrazzi: la presenza e', se c'e', la superficie. Mai inventare i metri.
  const mqDi = (cosa: RegExp) => {
    const a = l.match(new RegExp(`${cosa.source}[a-z]*[\\s(]*(?:di|da|coperto|scoperto|abitabile|vivibile)?[\\s(]*(?:di\\s*)?(\\d{1,3}(?:[.,]\\d)?)\\s*(?:m²|mq|m2|metri)`));
    const b = l.match(new RegExp(`(\\d{1,3}(?:[.,]\\d)?)\\s*(?:m²|mq|m2|metri)\\s*(?:quadr\\w*\\s*)?(?:di\\s*)?${cosa.source}`));
    const n = a ? numero(a[1]) : b ? numero(b[1]) : null;
    return n && n > 0 && n < 400 ? n : undefined;
  };
  const b = l.match(/(\d|due|tre|quattro)\s*balcon/);
  if (b) out.balconi = { due: 2, tre: 3, quattro: 4 }[b[1]] ?? Number(b[1]);
  else if (/balcon/.test(l)) out.balconi = 1;
  if (out.balconi) {
    out.mqBalconi = mqDi(/balcon/);
    out.trovati.push(out.mqBalconi ? `balconi ${out.mqBalconi} mq` : `${out.balconi === 1 ? "un balcone" : out.balconi + " balconi"}, superficie non dichiarata`);
  }
  if (/terrazz/.test(l)) {
    out.terrazzo = true;
    out.mqTerrazzi = mqDi(/terrazz/);
    out.trovati.push(out.mqTerrazzi ? `terrazzo ${out.mqTerrazzi} mq` : "terrazzo, superficie non dichiarata");
  }

  // ---- cantina, box
  if (/cantina|solaio|soffitta/.test(l)) { out.cantina = true; out.trovati.push("cantina"); }
  if (/\bbox\b|garage/.test(l)) { out.box = "box"; out.trovati.push("box"); }
  else if (/posto auto/.test(l)) { out.box = "posto"; out.trovati.push("posto auto"); }

  // ---- prezzo: il piu' grande con almeno cinque cifre, in euro
  const prezzi = [...t.matchAll(/(?:€|eur|euro)\s*(\d{1,3}(?:[.\s]\d{3})+|\d{5,7})|(\d{1,3}(?:[.\s]\d{3})+|\d{5,7})\s*(?:€|eur\b|euro)/gi)]
    .map((m) => numero((m[1] || m[2]).replace(/\s/g, ""))).filter((n) => n >= 30000 && n < 50_000_000);
  if (prezzi.length) { out.prezzo = Math.max(...prezzi); out.trovati.push(`prezzo ${out.prezzo.toLocaleString("it-IT")} €`); }

  return out;
}
