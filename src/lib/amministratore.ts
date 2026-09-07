"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/**
 * Dice se l'utente collegato e' un amministratore, per far comparire il bottone del
 * gestionale solo a chi puo' aprirlo davvero.
 *
 * La risposta arriva dal database (`sono_amministratore()`), non dal browser: qui non
 * si decide niente, si chiede. Chi manomettesse questo valore vedrebbe comparire un
 * bottone e riceverebbe comunque un 404, perche' e' la funzione `metriche_gestione`
 * a controllare i permessi, non la pagina.
 *
 * La risposta resta in sessionStorage per non richiederla a ogni cambio pagina: e'
 * una comodita' del singolo browser, e se lo spazio non c'e' o e' vietato si
 * richiede e basta.
 */
const chiave = (id: string) => `v-amm-${id}`;

export function useAmministratore(utenteId?: string | null) {
  const [amministratore, setAmministratore] = useState(false);

  useEffect(() => {
    if (!utenteId) { setAmministratore(false); return; }

    try {
      const salvato = sessionStorage.getItem(chiave(utenteId));
      if (salvato !== null) { setAmministratore(salvato === "1"); return; }
    } catch { /* niente memoria: si chiede al database */ }

    const sb = supabase();
    if (!sb) return;
    let vivo = true;
    sb.rpc("sono_amministratore").then(({ data, error }) => {
      if (!vivo) return;
      const si = !error && data === true;
      setAmministratore(si);
      try { sessionStorage.setItem(chiave(utenteId), si ? "1" : "0"); } catch { /* pazienza */ }
    });
    return () => { vivo = false; };
  }, [utenteId]);

  return amministratore;
}
