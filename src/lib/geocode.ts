/* --------------------------------------------------------------------------
   Geocoder. Da "via Solari 21" a coordinate.
   Nominatim e' gratuito ma chiede: una richiesta al secondo, User-Agent
   identificabile, nessun uso massivo. Per questo la ricerca a video NON chiama
   il geocoder a ogni tasto: i suggerimenti mentre scrivi arrivano dal dizionario
   locale, il geocoder parte solo quando l'utente conferma.
   -------------------------------------------------------------------------- */

import { BBOX_MILANO } from "./geo";

export type Posizione = {
  lat: number; lon: number; etichetta: string;
  via?: string; civico?: string;
  /** true se il geocoder ha trovato proprio quel civico, false se solo la via */
  conCivico?: boolean;
};

const cache = new Map<string, Posizione[]>();
let ultima = 0;

async function attendi(ms: number) {
  const passato = Date.now() - ultima;
  if (passato < ms) await new Promise((r) => setTimeout(r, ms - passato));
  ultima = Date.now();
}

/** Separa "via Solari 21" in via e civico: Nominatim risponde molto meglio se glieli dai distinti. */
export function spezzaIndirizzo(q: string) {
  const s = q.replace(/,\s*milano.*$/i, "").trim();
  const m = s.match(/^(.*?)[\s,]+(\d+[a-zA-Z]?)$/);
  return m ? { via: m[1].trim(), civico: m[2] } : { via: s, civico: "" };
}

async function nominatim(q: string, ignoraCivico = false): Promise<Posizione[]> {
  await attendi(1100);
  const { via, civico } = spezzaIndirizzo(q);
  const usaCivico = civico && !ignoraCivico;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("street", usaCivico ? `${civico} ${via}` : via);
  url.searchParams.set("city", "Milano");
  url.searchParams.set("country", "Italia");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  /* Senza vincolo geografico "Milano" viene inteso anche come citta' metropolitana,
     e una via omonima di Sesto o di Rho vince sulla nostra. Il riquadro e' quello
     delle zone OMI: fuori di li' non sapremmo comunque dare un prezzo. */
  const b = BBOX_MILANO;
  url.searchParams.set("viewbox", `${b.lonMin},${b.latMax},${b.lonMax},${b.latMin}`);
  url.searchParams.set("bounded", "1");
  const r = await fetch(url, {
    headers: { "User-Agent": process.env.GEOCODER_UA || "valmiro/0.1", "Accept-Language": "it" },
  });
  if (!r.ok) throw new Error(`Nominatim ha risposto ${r.status}`);
  const j = (await r.json()) as any[];
  return j.map((x) => {
    const a = x.address || {};
    const nome = [a.road || a.pedestrian || a.square || x.name, a.house_number].filter(Boolean).join(" ");
    return {
      lat: parseFloat(x.lat), lon: parseFloat(x.lon),
      etichetta: nome || (x.display_name || "").split(",").slice(0, 2).join(","),
      via: a.road || a.pedestrian || a.square, civico: a.house_number,
      conCivico: Boolean(a.house_number),
    };
  });
}

async function tomtom(q: string): Promise<Posizione[]> {
  const key = process.env.TOMTOM_KEY;
  if (!key) throw new Error("TOMTOM_KEY mancante");
  const r = await fetch(
    `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(q + ", Milano")}.json?key=${key}&countrySet=IT&limit=5`
  );
  if (!r.ok) throw new Error(`TomTom ha risposto ${r.status}`);
  const j = (await r.json()) as any;
  return (j.results || []).map((p: any) => ({
    lat: p.position.lat, lon: p.position.lon,
    etichetta: p.address.freeformAddress, via: p.address.streetName, civico: p.address.streetNumber,
  }));
}

/**
 * Da indirizzo a posizioni dentro Milano.
 *
 * Se il civico non esiste nella mappa — succede spesso, OpenStreetMap non ha tutti
 * i numeri civici d'Italia — si ritenta con la sola via invece di fallire. Meglio
 * una zona giusta trovata sulla via che un "indirizzo non riconosciuto" su una via
 * che esiste eccome: il risultato resta corretto, perche' la zona OMI e' comunque
 * l'unita' su cui si formano i prezzi.
 */
export async function geocodifica(indirizzo: string): Promise<Posizione[]> {
  const chiave = indirizzo.trim().toLowerCase();
  if (cache.has(chiave)) return cache.get(chiave)!;
  const provider = process.env.GEOCODER || "nominatim";
  if (provider === "tomtom") {
    const p = await tomtom(indirizzo);
    cache.set(chiave, p);
    return p;
  }
  let p = await nominatim(indirizzo);
  if (!p.length && spezzaIndirizzo(indirizzo).civico) p = await nominatim(indirizzo, true);
  cache.set(chiave, p);
  return p;
}
