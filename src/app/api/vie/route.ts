import { NextResponse } from "next/server";
import { suggerisci } from "@/lib/indirizzario";
import { ZONE, FASCIA_NOME } from "@/lib/data";

export const runtime = "nodejs";

/**
 * GET /api/vie?q=savo
 * I suggerimenti mentre si scrive. Prima venivano da un dizionario di 141
 * quartieri compilato nel browser; ora sono le 4.030 vie dell'anagrafe
 * comunale, che non possono stare nel bundle client. E' il nostro server:
 * si puo' chiamare a ogni tasto senza limiti di frequenza.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ vie: [] });

  const vie = suggerisci(q, 8)
    .filter((v) => ZONE[v.zona])
    .map((v) => ({
      etichetta: v.nome,
      zona: v.zona,
      descrizione: ZONE[v.zona].d,
      fascia: FASCIA_NOME[ZONE[v.zona].f],
      civici: v.civici,
      /* Su una via che attraversa piu' zone il civico cambia la stima: chi
         sceglie dall'elenco senza numero deve saperlo prima, non dopo. */
      multizona: Boolean(v.zone),
    }));

  return NextResponse.json({ vie });
}
