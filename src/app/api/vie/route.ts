import { NextResponse } from "next/server";
import { suggerisci, suggerisciCivici, spezza } from "@/lib/indirizzario";
import { ZONE, FASCIA_NOME } from "@/lib/data";

export const runtime = "nodejs";

/**
 * GET /api/vie?q=savo
 * I suggerimenti mentre si scrive. Prima venivano da un dizionario di 141
 * quartieri compilato nel browser; ora sono le 4.030 vie dell'anagrafe
 * comunale, che non possono stare nel bundle client. E' il nostro server:
 * si puo' chiamare a ogni tasto senza limiti di frequenza.
 *
 * Appena compare un numero, la via piu' probabile e' considerata scelta e la
 * lista passa ai suoi civici: chi scrive "torino 4" sta cercando un portone,
 * non ha bisogno di vedere ancora Via Ottorino Respighi.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ vie: [] });

  const { civico } = spezza(q);
  const trovate = suggerisci(q, 8).filter((v) => ZONE[v.zona]);

  const vie = trovate.map((v) => ({
    etichetta: v.nome,
    zona: v.zona,
    descrizione: ZONE[v.zona].d,
    fascia: FASCIA_NOME[ZONE[v.zona].f],
    civici: v.civici,
    /* Su una via che attraversa piu' zone il civico cambia la stima: chi
       sceglie dall'elenco senza numero deve saperlo prima, non dopo. */
    multizona: Boolean(v.zone),
  }));

  if (!civico || !trovate.length) return NextResponse.json({ vie });

  const via = trovate[0];
  const { elenco, vicini } = suggerisciCivici(via, civico, 6);
  const civici = elenco
    .filter((c) => ZONE[c.zona])
    .map((c) => ({
      etichetta: `${via.nome} ${c.civico}`,
      civico: c.civico,
      zona: c.zona,
      descrizione: ZONE[c.zona].d,
      fascia: FASCIA_NOME[ZONE[c.zona].f],
      lat: c.lat, lon: c.lon,
    }));

  return NextResponse.json({
    vie: vie.slice(0, 1),
    via: via.nome,
    civicoCercato: civico,
    civici,
    vicini,
  });
}
