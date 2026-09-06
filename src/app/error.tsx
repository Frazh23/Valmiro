'use client';
import { useEffect } from 'react';
import { misura } from '@/lib/telemetria';
export default function Errore({ reset }: { error: Error; reset:()=>void }) {
 useEffect(()=>misura('errore_ui'),[]);
 return (
  <main className="v-wrap v-section">
   <h1 className="v-h1">Qualcosa non ha funzionato</h1>
   <p className="v-lead" style={{ marginTop: "var(--s-4)" }}>
    Riprova: i dati che hai inserito restano dove sono, e non finiscono nella diagnostica.
   </p>
   <div className="v-actions" style={{ marginTop: "var(--s-6)" }}>
    <button className="v-btn v-btn--accent" onClick={reset}>Riprova</button>
   </div>
  </main>
 );
}
