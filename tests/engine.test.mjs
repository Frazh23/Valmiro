import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* I test girano sul modulo compilato al volo da tsx? No: per non aggiungere dipendenze,
   verifichiamo qui gli invarianti sui dati e le proprieta' del motore ricalcolandone la
   logica critica. Per testare engine.ts direttamente: npm i -D tsx e usa `tsx --test`. */

const ZONE = JSON.parse(readFileSync(new URL("../data/quotazioni-omi-2024-2.json", import.meta.url)));
const GEO = JSON.parse(readFileSync(new URL("../data/zone-omi.json", import.meta.url)));

test("i dati OMI coprono 42 zone quotate", () => {
  assert.equal(Object.keys(ZONE).length, 42);
});

test("ogni zona ha almeno una fascia per le abitazioni civili", () => {
  for (const [z, o] of Object.entries(ZONE)) {
    assert.ok(o.civ.NORMALE || o.civ.OTTIMO, `zona ${z} senza quotazione civili`);
  }
});

test("le fasce sono ordinate e positive", () => {
  for (const [z, o] of Object.entries(ZONE))
    for (const t of ["civ", "sig", "eco", "vil"])
      for (const [stato, v] of Object.entries(o[t] || {})) {
        assert.ok(v[0] > 0 && v[1] >= v[0], `${z}/${t}/${stato} incoerente`);
      }
});

test("i poligoni coprono tutte le zone quotate", () => {
  const conGeometria = new Set(GEO.features.map((f) => f.properties.Zona));
  for (const z of Object.keys(ZONE)) assert.ok(conGeometria.has(z), `manca il poligono di ${z}`);
});

test("point-in-polygon: il Duomo cade in B12", () => {
  const dentroAnello = (lon, lat, r) => {
    let d = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) d = !d;
    }
    return d;
  };
  const zonaDi = (lon, lat) => {
    for (const f of GEO.features) {
      const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
      for (const p of polys) {
        let d = false;
        for (const r of p) if (dentroAnello(lon, lat, r)) d = !d;
        if (d) return f.properties.Zona;
      }
    }
    return null;
  };
  assert.equal(zonaDi(9.19, 45.4642), "B12");
  assert.equal(zonaDi(9.188, 45.472), "B15");
  assert.equal(zonaDi(9.211, 45.5165), "D34");
  assert.equal(zonaDi(9.4, 45.5), null);
});

test("il riquadro di Milano e' della misura giusta, e i poligoni sono il filtro vero", () => {
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  for (const f of GEO.features) {
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const p of polys) for (const r of p) for (const [x, y] of r) {
      if (y < latMin) latMin = y; if (y > latMax) latMax = y;
      if (x < lonMin) lonMin = x; if (x > lonMax) lonMax = x;
    }
  }
  const nelRiquadro = (lon, lat) => lon >= lonMin && lon <= lonMax && lat >= latMin && lat <= latMax;
  assert.ok(nelRiquadro(9.19, 45.4642), "il Duomo deve stare nel riquadro");
  assert.ok(lonMax - lonMin < 0.4 && latMax - latMin < 0.3, "riquadro troppo largo per essere Milano");

  /* Attenzione: il riquadro e' un rettangolo, e Milano non lo e'. Sesto San Giovanni
     ci cade dentro pur essendo un altro comune — provato: e' il motivo per cui il
     vincolo al geocoder restringe ma non garantisce. La garanzia e' il point-in-polygon
     della rotta, che scarta i punti fuori dalle zone. Questo test lo fissa, cosi'
     nessuno si illude che basti il riquadro. */
  assert.ok(nelRiquadro(9.2333, 45.5333), "Sesto cade nel rettangolo: il riquadro da solo non basta");
  assert.equal(zonaDelPuntoTest(9.2333, 45.5333), null, "ma i poligoni devono escludere Sesto");
  assert.equal(zonaDelPuntoTest(9.0417, 45.5333), null, "e anche Rho");
  assert.equal(zonaDelPuntoTest(9.19, 45.4642), "B12", "e tenere il Duomo");
});

function zonaDelPuntoTest(lon, lat) {
  const dentroAnello = (r) => {
    let d = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) d = !d;
    }
    return d;
  };
  for (const f of GEO.features) {
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const p of polys) {
      let d = false;
      for (const r of p) if (dentroAnello(r)) d = !d;
      if (d) return f.properties.Zona;
    }
  }
  return null;
}
