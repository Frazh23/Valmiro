import { NextResponse } from "next/server";
import { stima, PIANO_NON_VALUTABILE } from "@/lib/engine";
import { prospettoRistrutturazione } from "@/lib/ristrutturazione";
import { ZONE } from "@/lib/data";
import type { Input } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/estimate
 * body: Input + { ristrutturazione?: "base"|"completa"|"design", primaCasa?: boolean, scelte?: Scelte }
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errore: "Corpo della richiesta non valido" }, { status: 400 });
  }

  const i = body as Input;
  if (!i?.zona || !ZONE[i.zona]) return NextResponse.json({ errore: "Zona OMI non valida" }, { status: 400 });
  if (!(Number(i.mq) > 0)) return NextResponse.json({ errore: "Superficie non valida" }, { status: 400 });
  /* Un numero negativo non e' un metro quadro: si rifiuta, non si azzera in silenzio. */
  for (const campo of ["mqBalconi", "mqTerrazzi", "prezzoRichiesto"] as const) {
    const v = i[campo];
    if (v !== undefined && v !== null && Number(v) < 0) return NextResponse.json({ errore: `${campo} non puo' essere negativo` }, { status: 400 });
  }
  if (i.boxSeparato?.prezzo != null && Number(i.boxSeparato.prezzo) < 0) return NextResponse.json({ errore: "il prezzo del box non puo' essere negativo" }, { status: 400 });
  /* Un piano non quotato senza richiesta di simulazione: il motore rifiuta, e la risposta lo dice
     con le sue parole (422: la richiesta e' ben formata, ma non c'e' una valutazione da dare). */
  if (i.pianoDichiarato && !i.simulazionePiano) return NextResponse.json({ errore: PIANO_NON_VALUTABILE(i.pianoDichiarato) }, { status: 422 });

  try {
    const risultato = stima({ ...i, mq: Number(i.mq) });
    const out: any = { stima: risultato };
    if (body.ristrutturazione) {
      out.ristrutturazione = prospettoRistrutturazione(
        { ...i, mq: Number(i.mq) }, body.ristrutturazione, body.primaCasa !== false, body.scelte || {}
      );
    }
    // Qui va il salvataggio della stima: e' il dataset proprietario, vedi README.
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ errore: e.message }, { status: 400 });
  }
}
