/* --------------------------------------------------------------------------
   Geocoder. Da "via Solari 21" a coordinate.
   Nominatim e' gratuito ma chiede: una richiesta al secondo, User-Agent
   identificabile, nessun uso massivo. Per questo la ricerca a video NON chiama
   il geocoder a ogni tasto: i suggerimenti mentre scrivi arrivano dal dizionario
   locale, il geocoder parte solo quando l'utente conferma.
   -------------------------------------------------------------------------- */

export type Posizione = { lat: number; lon: number; etichetta: string; via?: string; civico?: string };

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

async function nominatim(q: string): Promise<Posizione[]> {
  await attendi(1100);
  const { via, civico } = spezzaIndirizzo(q);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("street", civico ? `${civico} ${via}` : via);
  url.searchParams.set("city", "Milano");
  url.searchParams.set("country", "Italia");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  const r = await fetch(url, {
    headers: { "User-Agent": process.env.GEOCODER_UA || "vaylo/0.1", "Accept-Language": "it" },
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

export async function geocodifica(indirizzo: string): Promise<Posizione[]> {
  const chiave = indirizzo.trim().toLowerCase();
  if (cache.has(chiave)) return cache.get(chiave)!;
  const provider = process.env.GEOCODER || "nominatim";
  const p = provider === "tomtom" ? await tomtom(indirizzo) : await nominatim(indirizzo);
  cache.set(chiave, p);
  return p;
}
