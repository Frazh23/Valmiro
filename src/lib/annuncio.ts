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

/** Che cosa dice l'annuncio di una dotazione: c'e', non c'e', non lo dice. Tre cose diverse. */
export type Presenza = "si" | "no" | "?";

export type Letto = {
  indirizzo?: string;
  mq?: number;
  piano?: Piano;
  /** un piano che il modello non quota (seminterrato, interrato): si dice, non si traduce in silenzio */
  pianoNonSupportato?: string;
  ascensore?: boolean;
  stato?: Stato;
  /** "nd" quando l'annuncio dice che la classe non e' disponibile */
  classe?: Classe | "nd";
  /** quanti balconi dichiara l'annuncio (presenza, non metri) */
  balconi?: number;
  /** superficie dei balconi, solo se l'annuncio la scrive */
  mqBalconi?: number;
  /** l'annuncio nomina un terrazzo */
  terrazzo?: boolean;
  /** superficie del terrazzo, solo se l'annuncio la scrive */
  mqTerrazzi?: number;
  cantina?: boolean;
  /** box o posto auto compresi nel prezzo */
  box?: "nessuno" | "posto" | "box";
  /** box acquistabile a parte: fuori dal prezzo dell'abitazione, con il suo prezzo se scritto */
  boxSeparato?: { prezzo: number | null };
  /** presenza, assenza dichiarata o silenzio, per ogni dotazione */
  presenze: { balcone: Presenza; terrazzo: Presenza; cantina: Presenza; box: Presenza | "separato" | "posto" };
  prezzo?: number;
  /** cosa e' stato riconosciuto, in parole, per dirlo a chi legge */
  trovati: string[];
  /** cose che l'annuncio dice e che il modulo non puo' rappresentare come vorrebbe */
  avvisi: string[];
};

const VIE = "via|viale|piazza|piazzale|corso|largo|alzaia|bastioni|foro|galleria|ripa|vicolo|passaggio|cascina";

const numero = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

/**
 * L'annuncio dice che una cosa c'e', che non c'e', o non ne parla. Una parola
 * negata entro la stessa proposizione — «senza balcone e terrazzo», «cantina:
 * no», «privo di ascensore» — e' un'assenza dichiarata, non una presenza. La
 * finestra di ricerca a ritroso si ferma a punto, punto e virgola, virgola e
 * «con», cosi' «non ristrutturato, con balcone» tiene il balcone.
 */
function presenza(l: string, parola: RegExp): Presenza {
  const re = new RegExp(parola.source, "g");
  let vista = false;
  for (const m of l.matchAll(re)) {
    vista = true;
    const i = m.index!;
    let prima = l.slice(Math.max(0, i - 48), i);
    const taglio = Math.max(prima.lastIndexOf(". "), prima.lastIndexOf("; "), prima.lastIndexOf(", "), prima.lastIndexOf(" con "));
    if (taglio >= 0) prima = prima.slice(taglio + 2);
    const dopo = l.slice(i + m[0].length, i + m[0].length + 28);
    const negataPrima = /(^|\s)(senza|no|non|nessun[ao]?|priv[oa] di|né|ne'|assenza di|manca(?:no)? (?:il|la|i|le|un[ao]?)?)\s*$/.test(prima + " ") || /(senza|nessun[ao]?|priv[oa] di|né)\s+(\w+\s+){0,3}$/.test(prima);
    const negataDopo = /^\w*\s*(?::|\s)\s*(no\b|assente|non presente|non disponibile|non c'e|non c'è|non previst)/.test(dopo);
    if (!negataPrima && !negataDopo) return "si";
  }
  return vista ? "no" : "?";
}

export function leggiAnnuncio(testo: string): Letto {
  const t = testo.replace(/\s+/g, " ").trim();
  const l = t.toLowerCase();
  const out: Letto = { trovati: [], avvisi: [], presenze: { balcone: "?", terrazzo: "?", cantina: "?", box: "?" } };

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

  // ---- piano: il seminterrato non e' fra quelli quotati dal modello, e lo si dice
  if (/seminterrato|interrato|sottotetto non abitabile/.test(l) && !/piano\s+terra/.test(l)) {
    out.pianoNonSupportato = /seminterrato/.test(l) ? "seminterrato" : "interrato";
    out.avvisi.push(`piano ${out.pianoNonSupportato}: il modello quota dal piano terra in su, non ha un coefficiente per questo piano. scegli «terra» sapendo che la stima sarà alta, o non usarla`);
  } else if (/\battico\b|ultimo piano/.test(l)) out.piano = "ultimo";
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

  // ---- stato di conservazione: prima le negazioni, poi le parole positive
  if (/da ristrutturare|da rimodernare|da sistemare|da rinnovare|non ristrutturat|mai ristrutturat|da rifare/.test(l)) out.stato = "rist";
  else if (/nuova costruzione|in costruzione|mai abitat|di nuova realizzazione|\bnuovo\b.{0,20}\bconsegna|classe a\d?\b.{0,40}nuov/.test(l)) out.stato = "nuov";
  else if (/ristrutturat|rinnovat|ottimo stato|ottime condizioni|perfette condizioni|finemente/.test(l) && !/non (?:e'|è) ristrutturat/.test(l)) out.stato = "otti";
  else if (/buono stato|buone condizioni|abitabile|discret/.test(l)) out.stato = "abit";
  if (out.stato) out.trovati.push({ rist: "da ristrutturare", abit: "abitabile", otti: "ristrutturata", nuov: "nuova" }[out.stato]);

  // ---- classe energetica: "classe energetica D", "classe: A4", "APE: G"
  const clNd = /classe\s*(?:energetica)?\s*[:\-]?\s*(?:non disponibile|n\.?\s?d\.?|nd\b|non dichiarata|in fase di (?:definizione|certificazione|rilascio)|da definire|non pervenuta|esente|in attesa)/.test(l);
  const cl = l.match(/classe\s*(?:energetica)?\s*[:\-]?\s*([a-g])(?:\d)?\b/) || l.match(/\bape\s*[:\-]?\s*([a-g])(?:\d)?\b/);
  if (clNd) { out.classe = "nd"; out.trovati.push("classe energetica non disponibile"); }
  else if (cl) { out.classe = cl[1].toUpperCase() as Classe; out.trovati.push(`classe ${out.classe}`); }

  // ---- balconi e terrazzi: la presenza e', se c'e', la superficie. Mai inventare i metri.
  const mqDi = (cosa: RegExp) => {
    const a = l.match(new RegExp(`${cosa.source}[a-z]*[\\s(]*(?:di|da|coperto|scoperto|abitabile|vivibile)?[\\s(]*(?:di\\s*)?(\\d{1,3}(?:[.,]\\d)?)\\s*(?:m²|mq|m2|metri)`));
    const b = l.match(new RegExp(`(\\d{1,3}(?:[.,]\\d)?)\\s*(?:m²|mq|m2|metri)\\s*(?:quadr\\w*\\s*)?(?:di\\s*)?${cosa.source}`));
    const n = a ? numero(a[1]) : b ? numero(b[1]) : null;
    return n && n > 0 && n < 400 ? n : undefined;
  };
  out.presenze = { balcone: presenza(l, /balcon/), terrazzo: presenza(l, /terrazz/), cantina: presenza(l, /cantina|solaio|soffitta/), box: "?" };

  if (out.presenze.balcone === "si") {
    const b = l.match(/(\d|due|tre|quattro)\s*balcon/);
    out.balconi = b ? ({ due: 2, tre: 3, quattro: 4 } as Record<string, number>)[b[1]] ?? Number(b[1]) : 1;
    out.mqBalconi = mqDi(/balcon/);
    out.trovati.push(out.mqBalconi ? `balconi ${out.mqBalconi} mq` : `${out.balconi === 1 ? "un balcone" : out.balconi + " balconi"}, superficie non dichiarata`);
  } else if (out.presenze.balcone === "no") out.trovati.push("senza balcone");

  if (out.presenze.terrazzo === "si") {
    out.terrazzo = true;
    out.mqTerrazzi = mqDi(/terrazz/);
    out.trovati.push(out.mqTerrazzi ? `terrazzo ${out.mqTerrazzi} mq` : "terrazzo, superficie non dichiarata");
  } else if (out.presenze.terrazzo === "no") out.trovati.push("senza terrazzo");

  if (out.presenze.cantina === "si") { out.cantina = true; out.trovati.push("cantina"); }
  else if (out.presenze.cantina === "no") { out.cantina = false; out.trovati.push("senza cantina"); }

  // ---- box: compreso, assente, a parte (fuori dal prezzo dell'abitazione), oppure posto auto
  const boxP = presenza(l, /\bbox\b|garage/);
  const postoP = presenza(l, /posto auto/);
  const separato = /(?:\bbox\b|garage|posto auto)[^.;]{0,40}(?:acquistabile (?:separatamente|a parte)|a parte|separatamente|non (?:incluso|compreso)|escluso dal prezzo|opzionale|in aggiunta|in piu)|(?:possibilit[aà] di acquist\w*|eventuale)[^.;]{0,20}(?:\bbox\b|garage|posto auto)/.test(l);
  if (boxP === "si" && separato) {
    const pb = l.match(/(?:\bbox\b|garage)[^.;]{0,60}?(?:€|eur|euro)\s*(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})|(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})\s*(?:€|eur\b|euro)[^.;]{0,30}(?:\bbox\b|garage)/);
    const prezzoBox = pb ? numero((pb[1] || pb[2]).replace(/\s/g, "")) : null;
    out.boxSeparato = { prezzo: prezzoBox && prezzoBox >= 5000 && prezzoBox < 400000 ? prezzoBox : null };
    out.presenze.box = "separato";
    out.box = "nessuno";
    out.trovati.push(out.boxSeparato.prezzo ? `box acquistabile a parte, ${out.boxSeparato.prezzo.toLocaleString("it-IT")} €` : "box acquistabile a parte, prezzo non indicato");
  } else if (boxP === "si") { out.box = "box"; out.presenze.box = "si"; out.trovati.push("box compreso"); }
  else if (postoP === "si") { out.box = "posto"; out.presenze.box = "posto"; out.trovati.push("posto auto"); }
  else if (boxP === "no" || postoP === "no") { out.box = "nessuno"; out.presenze.box = "no"; out.trovati.push("senza box"); }

  // ---- prezzo: il piu' grande con almeno cinque cifre, in euro
  const prezzi = [...t.matchAll(/(?:€|eur|euro)\s*(\d{1,3}(?:[.\s]\d{3})+|\d{5,7})|(\d{1,3}(?:[.\s]\d{3})+|\d{5,7})\s*(?:€|eur\b|euro)/gi)]
    .map((m) => numero((m[1] || m[2]).replace(/\s/g, ""))).filter((n) => n >= 30000 && n < 50_000_000);
  const soloBox = out.boxSeparato?.prezzo && prezzi.length === 1 && prezzi[0] === out.boxSeparato.prezzo;
  if (prezzi.length && !soloBox) { out.prezzo = Math.max(...prezzi); out.trovati.push(`prezzo ${out.prezzo.toLocaleString("it-IT")} €`); }

  return out;
}
