import { ZONE } from "./data";
import { stima, DETRAZIONE, ONERI, MOLTIPLICATORE_RISTRUTTURAZIONE } from "./engine";
import type { Input, Stato } from "./types";

/* --------------------------------------------------------------------------
   Ristrutturazione, intervento per intervento.

   I tre pacchetti (Essenziale, Completa, Design) non sono piu' un prezzo al
   metro: sono una precompilazione di questo catalogo. Ogni voce dice cosa
   comprende, su che base si calcola e quanto costa in ciascun pacchetto, IVA
   esclusa. Chi legge puo' tenerla, toglierla, dire che l'ha gia' fatta o
   metterci il preventivo del suo fornitore: il costo residuo, le imposte, la
   detrazione e il valore atteso si rifanno di conseguenza.

   Il valore dopo i lavori non e' un premio al pacchetto: dipende da quali
   lavori ci sono. Lo stato «ottimo» dell'OMI presuppone impianti, bagni,
   pavimenti e finiture rifatti; «nuovo» presuppone anche serramenti, porte e
   impianto termico. Se manca un lavoro necessario, lo stato atteso scende e la
   pagina dice perche'. La classe energetica non si presume da un pacchetto:
   dipende da infissi, impianto termico e isolamento, e qui non si quantifica.

   Prezzi unitari: ordine di grandezza da prezzari e guide 2026 per Milano
   (Il Giornale Edile, "Costo ristrutturazione al mq 2026", IVA esclusa:
   demolizioni 25-50 euro/mq, elettrico 70-120, idraulico 80-140, bagno
   6.000-12.000 a corpo, pavimenti 60-150, infissi 350-1.200 a finestra,
   imbiancatura 12-25 euro/mq di parete, caldaia o pompa di calore
   3.000-12.000). Sono medie di fascia, non preventivi: la pagina lo dice.
   -------------------------------------------------------------------------- */

export type Pacchetto = "base" | "completa" | "design";
export type Modo = "incluso" | "escluso" | "fatto" | "preventivo";

export type Scelta = {
  modo: Modo;
  /** solo con modo "preventivo": la cifra del fornitore */
  preventivo?: number;
  /** il preventivo comprende l'IVA (10% sui lavori) */
  ivaInclusa?: boolean;
  /** il preventivo copre solo i materiali: la posa la stimiamo noi */
  soloMateriali?: boolean;
};
export type Scelte = Partial<Record<string, Scelta>>;

type Base = "mq" | "pareti" | "bagni" | "finestre" | "porte" | "corpo";

export type Intervento = {
  id: string;
  nome: string;
  /** cosa comprende, per non contare due volte la stessa cosa */
  cosa: string;
  base: Base;
  /** prezzo unitario imponibile per pacchetto; null = il pacchetto non lo prevede */
  unitario: Record<Pacchetto, number | null>;
  /** a corpo aggiuntivo per bagno, solo per l'impianto idraulico */
  perBagno?: Record<Pacchetto, number>;
  /** lo stato conservativo che questo lavoro rende raggiungibile */
  necessarioPer: Stato | null;
  /** incide sulla classe energetica (che non stimiamo) */
  energia?: boolean;
};

export const INTERVENTI: Intervento[] = [
  { id: "demolizioni", nome: "Demolizioni e smaltimento", base: "mq", necessarioPer: "nuov",
    cosa: "Rimozione di pavimenti, rivestimenti, sanitari, impianti vecchi e tramezzi da spostare; trasporto in discarica e oneri di conferimento.",
    unitario: { base: null, completa: 40, design: 50 } },
  { id: "elettrico", nome: "Impianto elettrico", base: "mq", necessarioPer: "otti",
    cosa: "Rifacimento completo a norma: quadro, linee, punti luce e prese, citofono, predisposizione dati. In Design anche domotica.",
    unitario: { base: 75, completa: 110, design: 140 } },
  { id: "idraulico", nome: "Impianto idraulico e bagni", base: "mq", necessarioPer: "otti",
    cosa: "Adduzione e scarichi nuovi, piu' i bagni completi a corpo: sanitari, rubinetteria, piatto doccia o vasca, rivestimenti del bagno e posa. I rivestimenti degli altri ambienti stanno in «Pavimenti e rivestimenti».",
    unitario: { base: 85, completa: 120, design: 150 }, perBagno: { base: 6500, completa: 10000, design: 14000 } },
  { id: "termico", nome: "Riscaldamento e climatizzazione", base: "corpo", necessarioPer: "nuov", energia: true,
    cosa: "Essenziale: sostituzione della caldaia. Completa: caldaia a condensazione e radiatori nuovi. Design: pompa di calore e climatizzazione canalizzata. Se il palazzo ha il centralizzato, il costo cala e va detto qui.",
    unitario: { base: 3500, completa: 7000, design: 14000 } },
  { id: "infissi", nome: "Infissi", base: "finestre", necessarioPer: "nuov", energia: true,
    cosa: "Serramenti esterni con vetrocamera, fornitura e posa, smaltimento dei vecchi. Non comprende le porte interne. Attenzione all'IVA: sugli infissi il 10% vale solo fino al valore della posa, il resto e' al 22%.",
    unitario: { base: null, completa: 850, design: 1200 } },
  { id: "pavimenti", nome: "Pavimenti e rivestimenti", base: "mq", necessarioPer: "otti",
    cosa: "Essenziale: pavimento sovrapposto all'esistente. Completa: massetto e nuovo pavimento in gres o parquet di serie. Design: parquet o pietra con posa di pregio. Esclusi i bagni, che stanno nell'idraulico.",
    unitario: { base: 60, completa: 110, design: 170 } },
  { id: "porte", nome: "Porte interne", base: "porte", necessarioPer: "nuov",
    cosa: "Porte interne con telaio, maniglie e posa. Il portoncino blindato non e' compreso.",
    unitario: { base: null, completa: 600, design: 950 } },
  { id: "tinteggiatura", nome: "Tinteggiatura", base: "pareti", necessarioPer: "otti",
    cosa: "Rasatura dove serve, due mani su pareti e soffitti. Design: finiture decorative in alcuni ambienti.",
    unitario: { base: 12, completa: 18, design: 25 } },
  { id: "tecnici", nome: "Progettazione, direzione lavori e pratiche", base: "corpo", necessarioPer: null,
    cosa: "Progetto, direzione dei lavori, pratica edilizia (CILA o SCIA), sicurezza, aggiornamento catastale e attestato energetico a fine lavori. Le parcelle hanno cassa previdenziale 4% e IVA 22%.",
    unitario: { base: 0, completa: 0, design: 0 } },
];

export const PACCHETTI: { id: Pacchetto; nome: string; statoDopo: Stato; cosa: string }[] = [
  { id: "base", nome: "Essenziale", statoDopo: "otti", cosa: "Impianti a norma, bagni rifatti, pavimento sovrapposto, tinteggiatura. Serramenti, porte e riscaldamento restano quelli che ci sono." },
  { id: "completa", nome: "Completa", statoDopo: "nuov", cosa: "Demolizioni, impianti nuovi, caldaia a condensazione, serramenti, pavimenti, porte e finiture di livello: la casa torna come nuova." },
  { id: "design", nome: "Design", statoDopo: "nuov", cosa: "Come Completa, con domotica, pompa di calore e climatizzazione canalizzata, parquet o pietra, porte e finiture d'autore." },
];

/** Le quantita' su cui si calcola ogni voce, dedotte dalla superficie: dichiarate, non nascoste. */
export function quantita(i: Input) {
  const mq = i.mq;
  return {
    mq,
    pareti: Math.round(mq * 2.7),                 // pareti e soffitti: circa 2,7 volte il pavimento
    bagni: mq < 75 ? 1 : mq < 140 ? 2 : 3,
    finestre: Math.max(2, Math.round(mq / 12)),
    porte: Math.max(2, Math.round(mq / 15)),
    corpo: 1,
  };
}

const BASE_TESTO: Record<Base, (q: ReturnType<typeof quantita>) => string> = {
  mq: (q) => `${q.mq} mq di pavimento`,
  pareti: (q) => `${q.pareti} mq di pareti e soffitti (2,7 volte il pavimento)`,
  bagni: (q) => `${q.bagni} ${q.bagni === 1 ? "bagno" : "bagni"}`,
  finestre: (q) => `${q.finestre} finestre (una ogni 12 mq)`,
  porte: (q) => `${q.porte} porte (una ogni 15 mq)`,
  corpo: () => "a corpo",
};

/** Costo imponibile che Valmiro stima per una voce in un pacchetto, con il moltiplicatore di fascia. */
export function stimato(v: Intervento, p: Pacchetto, i: Input) {
  const u = v.unitario[p];
  if (u === null) return null;
  const q = quantita(i);
  const fascia = (ZONE[i.zona]?.f || "D") as keyof typeof MOLTIPLICATORE_RISTRUTTURAZIONE;
  const m = MOLTIPLICATORE_RISTRUTTURAZIONE[fascia] ?? 1;
  let c = u * q[v.base];
  if (v.perBagno) c += v.perBagno[p] * q.bagni;
  return c * m;
}

export type VoceProspetto = {
  id: string; nome: string; cosa: string; base: string;
  /** cosa stimerebbe Valmiro, imponibile; null se il pacchetto non la prevede */
  stimato: number | null;
  modo: Modo;
  scelta: Scelta;
  /** imponibile che entra nel conto (0 se esclusa o gia' fatta) */
  imponibile: number;
  iva: number;
  /** vero se per raggiungere lo stato atteso del pacchetto questa voce serve */
  necessaria: boolean;
  nota?: string;
};

export type Prospetto = {
  pacchetto: Pacchetto;
  livello: string;
  voci: VoceProspetto[];
  /** imponibile dei lavori (senza tecnici) */
  lavori: number;
  iva: number;
  tecnici: number;
  pratiche: number;
  /** quanto c'e' da pagare, tutto compreso */
  costo: number;
  /** base su cui spetta la detrazione (i lavori esclusi o gia' fatti non ci sono) */
  detraibile: number;
  detrazione: number;
  rate: number;
  rataAnnua: number;
  costoNetto: number;
  /** quanto dei lavori era gia' fatto, al valore stimato: serve solo per dirlo */
  giaFatto: number;
  statoAttuale: Stato;
  statoAtteso: Stato;
  /** lo stato che il pacchetto avrebbe raggiunto con tutti i lavori */
  statoPacchetto: Stato;
  /** voci necessarie allo stato del pacchetto che mancano */
  mancanti: string[];
  valorePrima: number;
  valoreDopo: number;
  valoreDopoMin: number;
  valoreDopoMax: number;
  sigmaDopo: number;
  /** incremento di valore meno spesa netta: indicativo, il numero meno solido della pagina */
  margine: number;
  /** cose che il metodo non quantifica, dette in chiaro */
  nonQuantificato: string[];
  /* compatibilita' con il prospetto vecchio */
  euroMq: number;
};

const ORDINE: Stato[] = ["rist", "abit", "otti", "nuov"];
const REQUISITI: Record<Stato, string[]> = {
  rist: [],
  abit: ["elettrico", "idraulico"],
  otti: ["elettrico", "idraulico", "pavimenti", "tinteggiatura"],
  nuov: ["elettrico", "idraulico", "pavimenti", "tinteggiatura", "demolizioni", "termico", "infissi", "porte"],
};

/**
 * Il prospetto. `scelte` sovrascrive il pacchetto voce per voce; senza scelte
 * e' il pacchetto com'e'.
 */
export function prospettoRistrutturazione(i: Input, pacchettoId: string, primaCasa: boolean, scelte: Scelte = {}): Prospetto {
  const p = PACCHETTI.find((x) => x.id === pacchettoId);
  if (!p) throw new Error(`Pacchetto sconosciuto: ${pacchettoId}`);
  const q = quantita(i);

  const voci: VoceProspetto[] = [];
  let lavori = 0, iva = 0, giaFatto = 0;
  const fatteONelConto = new Set<string>();

  for (const v of INTERVENTI) {
    if (v.id === "tecnici") continue; // si calcola dopo, sugli altri
    const st = stimato(v, p.id, i);
    const scelta: Scelta = scelte[v.id] ?? { modo: st === null ? "escluso" : "incluso" };
    let imponibile = 0, nota: string | undefined;
    if (scelta.modo === "incluso") imponibile = st ?? 0;
    else if (scelta.modo === "preventivo" && scelta.preventivo && scelta.preventivo > 0) {
      imponibile = scelta.ivaInclusa ? scelta.preventivo / (1 + ONERI.ivaLavori) : scelta.preventivo;
      if (scelta.soloMateriali) {
        /* la posa vale, in un cantiere medio, circa la meta' del costo di una
           lavorazione finita (manodopera 40-55% del totale): si aggiunge la meta'
           della nostra stima, e lo si dice */
        const posa = (st ?? 0) * 0.5;
        imponibile += posa;
        nota = `preventivo per i soli materiali: aggiunta la posa stimata da Valmiro, ${Math.round(posa)} euro`;
      }
    } else if (scelta.modo === "fatto") giaFatto += st ?? 0;
    if (scelta.modo === "incluso" && st === null) { imponibile = 0; nota = "il pacchetto non prevede questo lavoro: scegli «Completa» o metti un preventivo"; }
    if (imponibile > 0 || scelta.modo === "fatto") fatteONelConto.add(v.id);
    lavori += imponibile;
    const ivaVoce = imponibile * ONERI.ivaLavori;
    iva += ivaVoce;
    voci.push({
      id: v.id, nome: v.nome, cosa: v.cosa, base: BASE_TESTO[v.base](q) + (v.perBagno ? ` + ${q.bagni} ${q.bagni === 1 ? "bagno" : "bagni"} a corpo` : ""),
      stimato: st, modo: scelta.modo, scelta, imponibile, iva: ivaVoce,
      necessaria: REQUISITI[p.statoDopo].includes(v.id), nota,
    });
  }

  // ---- tecnici: percentuale dei lavori che restano da fare, o preventivo
  const vt = INTERVENTI.find((v) => v.id === "tecnici")!;
  const stTecnici = lavori * ONERI.spesaTecnica * (1 + ONERI.cassaTecnici) * (1 + ONERI.ivaTecnici) + ONERI.pratiche;
  const sceltaT: Scelta = scelte.tecnici ?? { modo: "incluso" };
  let tecnici = 0, pratiche = 0, notaT: string | undefined;
  if (sceltaT.modo === "incluso") { tecnici = stTecnici - ONERI.pratiche; pratiche = ONERI.pratiche; }
  else if (sceltaT.modo === "preventivo" && sceltaT.preventivo) { tecnici = sceltaT.preventivo; pratiche = 0; notaT = "il preventivo del tecnico si intende lordo, IVA e cassa comprese; se non comprende i diritti comunali e il catasto, aggiungili"; }
  else if (sceltaT.modo === "escluso" && lavori > 0) notaT = "senza tecnico non si presenta la CILA: i lavori sugli impianti la richiedono. Escludilo solo se la pratica la fa qualcun altro";
  voci.push({ id: "tecnici", nome: vt.nome, cosa: vt.cosa, base: `${Math.round(ONERI.spesaTecnica * 100)}% dei lavori da fare, piu' cassa 4%, IVA 22% e ${ONERI.pratiche} euro di diritti, catasto e attestato`,
    stimato: stTecnici, modo: sceltaT.modo, scelta: sceltaT, imponibile: tecnici + pratiche, iva: 0, necessaria: false, nota: notaT });

  const costo = lavori + iva + tecnici + pratiche;

  // ---- detrazione: sulla spesa che si sostiene davvero
  const aliquota = primaCasa ? DETRAZIONE.primaCasa : DETRAZIONE.altri;
  const detraibile = Math.min(costo, DETRAZIONE.tetto);
  const detrazione = detraibile * aliquota;

  // ---- stato atteso: il piu' alto i cui requisiti sono tutti coperti, mai sotto l'attuale
  const idxAttuale = ORDINE.indexOf(i.stato);
  let statoAtteso: Stato = i.stato;
  for (const s of ORDINE) {
    if (ORDINE.indexOf(s) <= idxAttuale) { statoAtteso = ORDINE.indexOf(s) > ORDINE.indexOf(statoAtteso) ? s : statoAtteso; continue; }
    if (ORDINE.indexOf(s) > ORDINE.indexOf(p.statoDopo)) break;
    if (REQUISITI[s].every((id) => fatteONelConto.has(id))) statoAtteso = s;
  }
  const mancanti = REQUISITI[p.statoDopo].filter((id) => !fatteONelConto.has(id)).map((id) => INTERVENTI.find((v) => v.id === id)!.nome);

  const prima = stima(i);
  /* Il valore dopo i lavori cambia lo stato conservativo ma non la classe energetica:
     la fascia OTTIMO dell'OMI incorpora gia' un immobile efficiente, e applicare anche
     il coefficiente di classe conterebbe due volte lo stesso miglioramento. */
  const dopo = stima({ ...i, stato: statoAtteso });

  const nonQuantificato: string[] = [];
  const energia = voci.some((v) => (v.modo === "incluso" || v.modo === "preventivo") && v.imponibile > 0 && INTERVENTI.find((x) => x.id === v.id)?.energia);
  if (energia) nonQuantificato.push("La classe energetica probabilmente migliora con serramenti o impianto termico nuovi, ma di quanto dipende da isolamento e attestato: non lo stimiamo, e il valore qui non lo conta.");
  if (giaFatto > 0) nonQuantificato.push(`Lavori segnati come gia' fatti per circa ${Math.round(giaFatto / 100) * 100} euro: il valore di partenza e' quello dello stato che hai dichiarato oggi; se lo stato attuale non li riflette, il miglioramento ti verrebbe contato due volte.`);
  if (voci.some((v) => v.modo === "preventivo" && v.imponibile > 0)) nonQuantificato.push("Un preventivo piu' basso della nostra stima non cambia il valore atteso: cambia solo la spesa. Il valore dipende dallo stato in cui la casa arriva, non da quanto e' costato arrivarci.");

  return {
    pacchetto: p.id, livello: p.nome, voci,
    lavori, iva, tecnici, pratiche, costo,
    detraibile, detrazione, rate: DETRAZIONE.rate, rataAnnua: detrazione / DETRAZIONE.rate,
    costoNetto: costo - detrazione, giaFatto,
    statoAttuale: i.stato, statoAtteso, statoPacchetto: p.statoDopo, mancanti,
    valorePrima: prima.centro, valoreDopo: dopo.centro, valoreDopoMin: dopo.min, valoreDopoMax: dopo.max, sigmaDopo: dopo.sigma,
    margine: dopo.centro - prima.centro - (costo - detrazione),
    nonQuantificato,
    euroMq: i.mq > 0 ? lavori / i.mq : 0,
  };
}

/** Come Valmiro tratterebbe le scelte gia' fatte se si cambia pacchetto: si tengono solo «fatto» ed «escluso», che parlano della casa e non del prezzo. */
export function scelteAlCambioPacchetto(scelte: Scelte): Scelte {
  const out: Scelte = {};
  for (const [id, s] of Object.entries(scelte)) if (s && (s.modo === "fatto" || s.modo === "escluso")) out[id] = s;
  return out;
}
