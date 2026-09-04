"use client";
import { useEffect, useRef, useState } from "react";
import geo from "../../data/zone-omi-semplificate.json";
import { ZONE, FASCIA_NOME } from "@/lib/data";

const GEO = geo as unknown as Record<string, number[][][][]>;
const ALPHA: Record<string, number> = { B: 0.58, C: 0.42, D: 0.26, E: 0.15, R: 0.07 };

function dentroAnello(x: number, y: number, r: number[][]) {
  let d = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
function zonaDi(lon: number, lat: number) {
  for (const z in GEO) for (const p of GEO[z]) {
    let d = false;
    for (const r of p) if (dentroAnello(lon, lat, r)) d = !d;
    if (d) return z;
  }
  return null;
}

/** Mappa delle zone OMI. Il click assegna la zona in locale, senza chiamare nessun server. */
export default function Mappa({ zona, onPick }: { zona: string | null; onPick: (z: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const proj = useRef<any>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const cv = ref.current!;
    const disegna = () => {
      /* La mappa e' disegnata su canvas, quindi i colori vanno scritti a mano:
         li si prende dai token invece di dedurli dalla preferenza di sistema,
         che dopo il passaggio al tema chiaro fisso non descrive piu' la pagina. */
      const token = (nome: string, ripiego: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || ripiego;
      const accento = token("--accent", "#1F6F5C");
      const bordo = token("--line-strong", "#CFC8BD");
      const carta = token("--surface", "#FFFFFF");
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      let x0 = 999, y0 = 999, x1 = -999, y1 = -999;
      for (const z in GEO) for (const p of GEO[z]) for (const r of p) for (const c of r) {
        x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]);
        y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]);
      }
      const kx = Math.cos((((y0 + y1) / 2) * Math.PI) / 180), pad = 10;
      const s = Math.min((w - pad * 2) / ((x1 - x0) * kx), (h - pad * 2) / (y1 - y0));
      const ox = (w - (x1 - x0) * kx * s) / 2, oy = (h - (y1 - y0) * s) / 2;
      proj.current = { s, kx, x0, y1, ox, oy };
      for (const z in GEO) {
        const f = ZONE[z]?.f || z[0];
        const sel = z === zona, hov = z === hover;
        g.beginPath();
        for (const p of GEO[z]) for (const r of p) {
          r.forEach((c, i) => {
            const px = ox + (c[0] - x0) * kx * s, py = oy + (y1 - c[1]) * s;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          });
          g.closePath();
        }
        const a = (ALPHA[f] ?? 0.2) * (hov ? 1.45 : 1);
        g.fillStyle = accento;
        g.globalAlpha = sel ? 1 : a;
        g.fill("evenodd");
        g.globalAlpha = 1;   // il bordo e' pieno: l'alpha serviva solo al riempimento
        g.strokeStyle = sel ? carta : bordo;
        g.lineWidth = sel ? 1.6 : 0.7;
        g.stroke();
      }
    };
    disegna();
    addEventListener("resize", disegna);
    return () => removeEventListener("resize", disegna);
  }, [zona, hover]);

  const punto = (e: React.MouseEvent) => {
    const cv = ref.current!, r = cv.getBoundingClientRect(), p = proj.current;
    if (!p) return null;
    return zonaDi(p.x0 + (e.clientX - r.left - p.ox) / (p.s * p.kx), p.y1 - (e.clientY - r.top - p.oy) / p.s);
  };

  const etichetta = hover
    ? ZONE[hover] ? `${hover} · ${ZONE[hover].d}` : `${hover} · zona extraurbana`
    : zona && ZONE[zona] ? ZONE[zona].d : "Tocca la mappa dove si trova la casa";

  return (
    <div className="mapwrap">
      <canvas
        ref={ref}
        onMouseMove={(e) => setHover(punto(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => { const z = punto(e); if (z && ZONE[z]) onPick(z); }}
      />
      <div className="maptag">{etichetta}</div>
    </div>
  );
}
