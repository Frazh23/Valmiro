import geo from "../../data/zone-omi.json";

type Ring = number[][];
type Feature = {
  properties: { Zona: string; Zona_Descr: string; Fascia: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: any };
};

const FEATURES = (geo as any).features as Feature[];

/** Poligoni per zona, normalizzati a MultiPolygon. */
export const POLIGONI: Record<string, Ring[][]> = {};
for (const f of FEATURES) {
  const g = f.geometry;
  POLIGONI[f.properties.Zona] =
    g.type === "MultiPolygon" ? (g.coordinates as Ring[][]) : [g.coordinates as Ring[]];
}

function dentroAnello(lon: number, lat: number, r: Ring) {
  let dentro = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/**
 * Zona OMI che contiene il punto, o null se fuori dai confini di Milano.
 * Regola even-odd sugli anelli: i buchi dei poligoni sono gestiti da soli.
 */
export function zonaDelPunto(lon: number, lat: number): string | null {
  for (const zona in POLIGONI) {
    for (const poly of POLIGONI[zona]) {
      let dentro = false;
      for (const anello of poly) if (dentroAnello(lon, lat, anello)) dentro = !dentro;
      if (dentro) return zona;
    }
  }
  return null;
}
