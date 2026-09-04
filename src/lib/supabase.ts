"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Il client esiste solo se le chiavi sono configurate: cosi' l'app gira anche prima
   di avere un account, e la pagina di accesso lo dice invece di fingere un login. */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
/* Supabase ha rinominato le chiavi: i progetti nuovi danno una "publishable key"
   (sb_publishable_...), quelli vecchi la "anon key" (eyJ...). Accettiamo entrambe. */
const chiave =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const accountAttivo = Boolean(url && chiave);

let cliente: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!accountAttivo) return null;
  if (!cliente) cliente = createClient(url!, chiave!);
  return cliente;
}

export type Profilo = {
  id: string;
  tipo: "privato" | "agenzia";
  nome?: string | null;
  ragione_sociale?: string | null;
};
