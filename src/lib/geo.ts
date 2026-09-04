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

/**
 * Rettangolo che racchiude tutte le zone OMI di Milano, calcolato dai poligoni
 * stessi invece che scritto a mano: se un giorno l'area cambia, si aggiorna da solo.
 * Serve a vincolare il geocoder, che altrimenti risponde con vie omonime dei
 * comuni della citta' metropolitana.
 */
export const BBOX_MILANO = (() => {
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  for (const zona in POLIGONI)
    for (const poly of POLIGONI[zona])
      for (const anello of poly)
        for (const [x, y] of anello) {
          if (y < latMin) latMin = y;
          if (y > latMax) latMax = y;
          if (x < lonMin) lonMin = x;
          if (x > lonMax) lonMax = x;
        }
  return { lonMin, latMin, lonMax, latMax };
})();

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
