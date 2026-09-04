import { NextResponse } from "next/server";
import { stima, prospettoRistrutturazione } from "@/lib/engine";
import { ZONE } from "@/lib/data";
import type { Input } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/estimate
 * body: Input + { ristrutturazione?: "base"|"completa"|"design", primaCasa?: boolean }
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

  try {
    const risultato = stima({ ...i, mq: Number(i.mq), balconi: Number(i.balconi) || 0 });
    const out: any = { stima: risultato };
    if (body.ristrutturazione) {
      out.ristrutturazione = prospettoRistrutturazione(
        { ...i, mq: Number(i.mq) }, body.ristrutturazione, body.primaCasa !== false
      );
    }
    // Qui va il salvataggio della stima: e' il dataset proprietario, vedi README.
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ errore: e.message }, { status: 400 });
  }
}
