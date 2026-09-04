"use client";
import { useEffect, useState } from "react";
import { supabase, accountAttivo, type Profilo } from "./supabase";

/** Sessione corrente e profilo. Restituisce sempre qualcosa, anche senza account configurato. */
export function useSessione() {
  const [utente, setUtente] = useState<{ id: string; email?: string } | null>(null);
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [pronto, setPronto] = useState(!accountAttivo);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let vivo = true;

    const carica = async (u: any) => {
      if (!vivo) return;
      setUtente(u ? { id: u.id, email: u.email } : null);
      if (u) {
        const { data } = await sb.from("profili").select("*").eq("id", u.id).single();
        if (vivo) setProfilo((data as Profilo) || null);
      } else setProfilo(null);
      if (vivo) setPronto(true);
    };

    sb.auth.getUser().then(({ data }) => carica(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => carica(s?.user));
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  return { utente, profilo, pronto, accountAttivo };
}

export async function esci() {
  await supabase()?.auth.signOut();
  location.href = "/";
}
