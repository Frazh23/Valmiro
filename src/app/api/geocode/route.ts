import { NextResponse } from "next/server";
import { geocodifica } from "@/lib/geocode";
import { zonaDelPunto } from "@/lib/geo";
import { ZONE, FASCIA_NOME, cercaZona } from "@/lib/data";

export const runtime = "nodejs";

/**
 * GET /api/geocode?q=via Solari 21
 * Restituisce sempre una lista di candidati, ognuno gia' risolto alla sua zona OMI.
 * Se il geocoder non risponde si ripiega sul dizionario locale, dichiarandolo.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ errore: "Parametro q mancante" }, { status: 400 });

  let posizioni: Awaited<ReturnType<typeof geocodifica>> = [];
  let geocoderKo: string | null = null;
  try {
    posizioni = await geocodifica(q);
  } catch (e: any) {
    geocoderKo = e.message;
    console.error("[geocode] non disponibile:", e.message);
  }

  const candidati = [];
  const visti = new Set<string>();
  for (const p of posizioni) {
    const zona = zonaDelPunto(p.lon, p.lat);
    if (!zona || !ZONE[zona]) continue;             // fuori Milano o zona non quotata
    const chiave = p.etichetta + zona;
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    candidati.push({
      etichetta: p.etichetta, lat: p.lat, lon: p.lon, zona,
      descrizione: ZONE[zona].d, fascia: FASCIA_NOME[ZONE[zona].f],
      fonte: p.conCivico === false ? "via" : "civico",
      preciso: p.conCivico !== false,
    });
  }

  if (candidati.length) return NextResponse.json({ trovato: true, metodo: "geocoder", candidati });

  const dizionario = cercaZona(q).map((c) => ({
    etichetta: c.nome, zona: c.zona, descrizione: c.descrizione,
    fascia: FASCIA_NOME[ZONE[c.zona].f], fonte: "dizionario", preciso: false,
  }));

  return NextResponse.json({
    trovato: dizionario.length > 0,
    metodo: "dizionario",
    candidati: dizionario,
    motivo: geocoderKo
      ? "Il servizio di geocodifica non ha risposto: questi risultati vengono dal dizionario dei quartieri, verifica la zona sulla mappa."
      : posizioni.length
        ? "L'indirizzo esiste ma cade fuori dal Comune di Milano, o in una zona senza quotazioni residenziali."
        : "Indirizzo non riconosciuto: scegli il quartiere o indica il punto sulla mappa.",
  });
}
