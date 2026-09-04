import { NextResponse } from "next/server";
import { geocodifica } from "@/lib/geocode";
import { zonaDelPunto } from "@/lib/geo";
import { ZONE, FASCIA_NOME, cercaZona } from "@/lib/data";
import { risolvi } from "@/lib/indirizzario";

export const runtime = "nodejs";

const vestizione = (zona: string) => ({
  descrizione: ZONE[zona].d,
  fascia: FASCIA_NOME[ZONE[zona].f],
});

/**
 * GET /api/geocode?q=via Solari 21
 * Restituisce sempre una lista di candidati, ognuno gia' risolto alla sua zona OMI.
 *
 * L'ordine delle fonti e' per autorevolezza. Prima l'anagrafe comunale dei
 * civici: e' il dato ufficiale, sta in memoria, e sa dire anche quando un
 * numero civico non esiste — cosa che nessun geocoder distingue da un guasto.
 * Poi Nominatim, per gli indirizzi che l'anagrafe non copre. Infine il
 * dizionario dei quartieri, dichiarato come tale.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ errore: "Parametro q mancante" }, { status: 400 });

  const r = risolvi(q);

  if (r.esito === "civico" && ZONE[r.zona]) {
    return NextResponse.json({
      trovato: true,
      metodo: "anagrafe",
      candidati: [{
        etichetta: `${r.via.nome} ${r.civico}`,
        lat: r.lat, lon: r.lon, zona: r.zona, ...vestizione(r.zona),
        fonte: "anagrafe", preciso: true,
      }],
    });
  }

  if (r.esito === "civico-assente") {
    /* La via attraversa più zone e il numero non risulta: non scegliamo noi
       quale zona darle. Meglio proporre i civici che esistono davvero. */
    const vicini = r.vicini.length
      ? ` I numeri più vicini in anagrafe sono ${r.vicini.join(" e ")}.`
      : "";
    return NextResponse.json({
      trovato: false,
      metodo: "anagrafe",
      candidati: [],
      motivo: `Il civico ${r.civico} non risulta in ${r.via.nome} nell'anagrafe del Comune.${vicini} La via attraversa più zone, quindi il numero cambia la stima: correggilo o indica il punto sulla mappa.`,
    });
  }

  if (r.esito === "via" && ZONE[r.via.zona]) {
    const v = r.via;
    return NextResponse.json({
      trovato: true,
      metodo: "anagrafe",
      candidati: [{
        etichetta: v.nome, lat: v.lat, lon: v.lon, zona: v.zona, ...vestizione(v.zona),
        fonte: "via", preciso: false,
      }],
      motivo: v.zone
        ? `${v.nome} attraversa più zone OMI. Aggiungi il civico per una stima più precisa.`
        : undefined,
    });
  }

  // ------------------------------------------------ ripiego sul geocoder

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
      etichetta: p.etichetta, lat: p.lat, lon: p.lon, zona, ...vestizione(zona),
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
