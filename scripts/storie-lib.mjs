/**
 * Da tante letture dello stesso annuncio alla sua storia.
 *
 * L'archivio di taratura tiene fotografie: un annuncio, un prezzo, un giorno.
 * Serve a misurare quanto il motore somiglia ai prezzi chiesti. Per sapere a
 * quanto le case si *chiudono* serve un'altra cosa: lo stesso annuncio riletto
 * nel tempo, finche' sparisce. Questo modulo ricostruisce quella storia.
 *
 * L'identita' dell'annuncio e' `fonte:rif`, dove `rif` e' il codice che il
 * portale gli ha dato. Non l'indirizzo, non il prezzo: quelli cambiano, e un
 * ribasso e' proprio cio' che vogliamo vedere.
 *
 * Attenzione a una cosa, sempre: **un annuncio che sparisce non e' un annuncio
 * venduto**. Puo' essere stato ritirato, scaduto, ripubblicato da un'altra
 * agenzia. Il ribasso che si misura qui e' «quanto e' calato il prezzo chiesto
 * prima che l'annuncio uscisse», che e' una stima per difetto dello sconto
 * vero, e va detta con quel nome.
 */

const giorno = (s) => new Date(`${s}T12:00:00Z`).getTime();
export const giorniFra = (a, b) => Math.round((giorno(b) - giorno(a)) / 86400000);

/** Mediana; su liste vuote restituisce null invece di NaN. */
export function mediana(v) {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * @param letture righe {rif, fonte, data, prezzo, zona, stato, mq}
 * @param date    le date in cui la raccolta e' girata, in ordine: servono a
 *                distinguere «sparito» da «non ancora riletto»
 */
export function storie(letture, date = []) {
  const raccolte = [...new Set(date)].sort();
  const ultimaRaccolta = raccolte[raccolte.length - 1];

  const per = new Map();
  for (const l of letture) {
    if (!l.rif || !l.data || !(Number(l.prezzo) > 0)) continue;
    const k = `${l.fonte || "?"}:${l.rif}`;
    if (!per.has(k)) per.set(k, []);
    per.get(k).push({ ...l, prezzo: Number(l.prezzo) });
  }

  const out = [];
  for (const [chiave, v] of per) {
    v.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
    const prima = v[0], ultima = v[v.length - 1];
    const cali = [];
    for (let i = 1; i < v.length; i++) {
      if (v[i].prezzo < v[i - 1].prezzo) cali.push({ da: v[i - 1].prezzo, a: v[i].prezzo, quando: v[i].data });
    }
    /* Sparito = c'e' stata almeno una raccolta dopo l'ultima volta che l'abbiamo
       visto. Se l'ultima lettura e' dell'ultima raccolta, l'annuncio e' ancora
       vivo e la sua storia non e' finita: non va nelle statistiche di chiusura. */
    const dopo = raccolte.filter((d) => d > ultima.data);
    const sparito = dopo.length > 0;
    out.push({
      chiave, rif: prima.rif, fonte: prima.fonte,
      zona: prima.zona, fascia: (prima.zona || "?")[0], stato: prima.stato, mq: Number(prima.mq) || null,
      letture: v.length,
      primaData: prima.data, primoPrezzo: prima.prezzo,
      ultimaData: ultima.data, ultimoPrezzo: ultima.prezzo,
      cali,
      /* negativo = il prezzo e' sceso */
      ribasso: ultima.prezzo / prima.prezzo - 1,
      giorniVisto: giorniFra(prima.data, ultima.data),
      sparito,
      spartioEntro: sparito ? dopo[0] : null,
      viva: !sparito && ultima.data === ultimaRaccolta,
    });
  }
  return out.sort((a, b) => (a.chiave < b.chiave ? -1 : 1));
}

/**
 * Le statistiche che contano, sulle sole storie finite.
 * Chi e' ancora in vendita non dice niente sullo sconto: includerlo
 * riporterebbe verso zero una misura che parla di annunci conclusi.
 */
export function riassunto(S, gruppo = () => "tutti") {
  const finite = S.filter((s) => s.sparito);
  const per = new Map();
  for (const s of finite) {
    const k = gruppo(s);
    if (!per.has(k)) per.set(k, []);
    per.get(k).push(s);
  }
  const righe = [];
  for (const [k, v] of per) {
    righe.push({
      gruppo: k,
      n: v.length,
      ribassoMediano: mediana(v.map((s) => s.ribasso)),
      quotaConRibasso: v.filter((s) => s.ribasso < -0.001).length / v.length,
      giorniMediani: mediana(v.map((s) => s.giorniVisto)),
    });
  }
  return righe.sort((a, b) => b.n - a.n);
}
