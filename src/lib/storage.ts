"use client";
import type { Input, Stima } from "./types";
import { supabase } from "./supabase";

/* Le stime salvate. Per ora vivono nel browser di chi le fa: nessun account, nessun
   server. Quando ci sara' il database, questa e' l'unica funzione da cambiare — la
   forma del dato e' gia' quella della tabella `stime` in db/schema.sql. */

export type StimaSalvata = {
  id: string;
  creataIl: string;
  indirizzo: string;
  zona: string;
  descrizioneZona: string;
  input: Input;
  stima: Stima;
  prezzoEsposto?: number;
};

const CHIAVE = "vaylo.stime";
const CHIAVE_VECCHIA = "valorecasa.stime";

/* Il prodotto si chiamava valore.casa: se nel browser ci sono stime salvate con la
   vecchia chiave le spostiamo una volta sola, cosi' nessuno perde il proprio storico. */
function migraChiave() {
  if (typeof window === "undefined") return;
  try {
    const vecchie = localStorage.getItem(CHIAVE_VECCHIA);
    if (!vecchie) return;
    if (!localStorage.getItem(CHIAVE)) localStorage.setItem(CHIAVE, vecchie);
    localStorage.removeItem(CHIAVE_VECCHIA);
  } catch {}
}

export function leggiStime(): StimaSalvata[] {
  if (typeof window === "undefined") return [];
  migraChiave();
  try { return JSON.parse(localStorage.getItem(CHIAVE) || "[]"); } catch { return []; }
}

export function salvaStima(s: Omit<StimaSalvata, "id" | "creataIl">): StimaSalvata {
  const nuova: StimaSalvata = { ...s, id: crypto.randomUUID(), creataIl: new Date().toISOString() };
  try {
    const tutte = [nuova, ...leggiStime()].slice(0, 50);
    localStorage.setItem(CHIAVE, JSON.stringify(tutte));
  } catch {}
  return nuova;
}

export function eliminaStima(id: string) {
  try { localStorage.setItem(CHIAVE, JSON.stringify(leggiStime().filter((s) => s.id !== id))); } catch {}
}

/* ---------- versione con account ----------
   Quando l'utente e' dentro, le stime vanno nel database e lo seguono su ogni
   dispositivo. Le regole row level security fanno si' che veda solo le proprie. */


export async function salvaStimaAccount(utenteId: string, s: Omit<StimaSalvata, "id" | "creataIl">) {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.from("stime").insert({
    utente: utenteId,
    indirizzo: s.indirizzo,
    zona: s.zona,
    semestre_base: s.stima.semestre,
    input: s.input,
    risultato: s.stima,
    prezzo_esposto: s.prezzoEsposto ?? null,
  }).select().single();
  if (error) { console.error("[stime] salvataggio fallito:", error.message); return null; }
  return data;
}

export async function leggiStimeAccount(): Promise<StimaSalvata[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data, error } = await sb.from("stime").select("*").order("creata_il", { ascending: false }).limit(100);
  if (error) { console.error("[stime] lettura fallita:", error.message); return []; }
  return (data || []).map((r: any) => ({
    id: String(r.id),
    creataIl: r.creata_il,
    indirizzo: r.indirizzo || `Zona ${r.zona}`,
    zona: r.zona,
    descrizioneZona: r.risultato?.descrizioneZona || "",
    input: r.input,
    stima: r.risultato,
    prezzoEsposto: r.prezzo_esposto ?? undefined,
  }));
}

export async function eliminaStimaAccount(id: string) {
  await supabase()?.from("stime").delete().eq("id", id);
}

/** Porta nell'account le stime rimaste nel browser, poi svuota il locale. */
export async function migraStimeLocali(utenteId: string) {
  const locali = leggiStime();
  if (!locali.length) return 0;
  for (const s of locali) await salvaStimaAccount(utenteId, s);
  try { localStorage.removeItem(CHIAVE); } catch {}
  return locali.length;
}
