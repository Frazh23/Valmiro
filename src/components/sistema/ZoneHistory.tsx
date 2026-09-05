"use client";
import { eur, num, pct } from "@/lib/formato";
import { annoDi, semestreBreve, type Andamento } from "@/lib/affitto";

/**
 * La zona dal 2014: una linea morbida, il prezzo mediano OMI semestre per
 * semestre. Niente griglia, niente assi pesanti: il primo e l'ultimo valore
 * scritti accanto alla linea, gli anni sotto. Chi guarda deve capire in tre
 * secondi se la zona e' salita, e di quanto.
 */
export default function ZoneHistory({ a, zona }: { a: Andamento; zona: string }) {
  const W = 640, H = 220, PX = 8, PT = 28, PB = 30;
  const p = a.punti;
  const min = Math.min(...p.map((x) => x.prezzo)), max = Math.max(...p.map((x) => x.prezzo));
  const span = max - min || 1;
  const X = (i: number) => PX + (i / Math.max(1, p.length - 1)) * (W - 2 * PX);
  const Y = (v: number) => PT + (1 - (v - min) / span) * (H - PT - PB);
  const pts = p.map((x, i) => [X(i), Y(x.prezzo)] as const);

  /* curva di Catmull-Rom convertita in Bezier: morbida, passa dai punti veri */
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  const area = `${d} L ${pts[pts.length - 1][0]} ${H - PB} L ${pts[0][0]} ${H - PB} Z`;

  /* un'etichetta per anno, sul primo semestre: la serie parte dal secondo del
     2014, e scrivere "2014" a filo con "2015" farebbe solo una macchia */
  const anni = p.map((x, i) => ({ i, anno: annoDi(x.s), sem: x.s.slice(5) })).filter((x) => x.sem === "1");
  const primo = p[0], ultimo = p[p.length - 1];
  const su = a.variazione >= 0;

  if (a.nuova) {
    return (
      <p className="v-lead v-measure">
        La zona <b>{zona}</b> è stata istituita dall&apos;Agenzia delle Entrate nel {semestreBreve(a.dal)}: non ha
        ancora una storia propria. Oggi le abitazioni civili sono quotate {eur(ultimo.prezzo)} €/mq e i canoni
        {" "}{num(ultimo.canone, 1)} €/mq al mese, un rendimento lordo di zona del {pct(a.rendimentoZona, 1)}.
      </p>
    );
  }

  return (
    <div className="v-history">
      <p className="v-history__lead">
        <b className={su ? "pos" : "neg"}>{su ? "+" : "−"}{pct(Math.abs(a.variazione))}</b> dal {semestreBreve(a.dal)}
        {a.variazione2anni !== null && (
          <span> · {a.variazione2anni >= 0 ? "+" : "−"}{pct(Math.abs(a.variazione2anni), 1)} negli ultimi due anni</span>
        )}
      </p>
      <svg className="v-history__svg" viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Prezzo mediano OMI della zona ${zona} dal ${semestreBreve(a.dal)}: da ${eur(primo.prezzo)} a ${eur(ultimo.prezzo)} euro al metro quadro`}>
        <defs>
          <linearGradient id={`vh-${zona}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".14" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#vh-${zona})`} />
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.25" strokeLinecap="round" />
        <circle cx={pts[0][0]} cy={pts[0][1]} r="4" fill="var(--paper)" stroke="var(--accent)" strokeWidth="2" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill="var(--accent)" />
        <text x={pts[0][0]} y={pts[0][1] - 12} className="v-history__lbl" textAnchor="start">{eur(primo.prezzo)} €/mq</text>
        <text x={pts[pts.length - 1][0]} y={pts[pts.length - 1][1] - 12} className="v-history__lbl v-history__lbl--strong" textAnchor="end">{eur(ultimo.prezzo)} €/mq</text>
        {anni.map((x) => (
          <text key={x.anno} x={X(x.i)} y={H - 8} className="v-history__anno" textAnchor={x.i === 0 ? "start" : "middle"}>{x.anno}</text>
        ))}
      </svg>
      <p className="v-body v-measure" style={{ marginTop: "var(--s-5)" }}>
        Prezzo mediano delle abitazioni civili{a.stato === "OTTIMO" ? " in stato ottimo, l'unico quotato qui" : ""} nella zona {zona},
        semestre per semestre, da {eur(primo.prezzo)} a {eur(ultimo.prezzo)} €/mq. I canoni sono passati da{" "}
        {num(primo.canone, 1)} a {num(ultimo.canone, 1)} €/mq al mese ({a.variazioneCanone >= 0 ? "+" : "−"}{pct(Math.abs(a.variazioneCanone))}):
        il rendimento lordo di zona oggi è del {pct(a.rendimentoZona, 1)}.
      </p>
      <p className="v-small v-measure" style={{ marginTop: "var(--s-3)" }}>
        Le zone OMI di Milano sono state ridisegnate nel 2014: prima di allora i perimetri erano altri e i numeri non
        si confrontano. Quotazioni non aggiornate all&apos;indice Istat, per restare sul dato pubblicato.
      </p>
    </div>
  );
}
