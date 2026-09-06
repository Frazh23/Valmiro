import Link from "next/link";
import type { Metadata } from "next";
/* Fraunces, variabile, con tutti gli assi (peso, ottico, SOFT, WONK): e' il
   marchio e i titoli. Il file sta nel repo tramite npm: la build gira senza
   rete e nessuna richiesta parte verso Google. */
import "@fontsource-variable/fraunces/full.css";
import "../styles/tokens.css";
import "./globals.css";
import "../styles/sistema.css";

export const metadata: Metadata = {
  title: "Valmiro · quanto vale casa a Milano",
  description:
    "Stima del valore di un immobile a Milano sulle quotazioni ufficiali OMI dell'Agenzia delle Entrate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {children}
        {/* Compare solo quando i termini sono davvero pubblicati e il gestore e' configurato:
            finche' /termini risponde 404, un link non deve esistere. Vedi docs/termini-pubblicazione.md. */}
        {process.env.TERMINI_PUBBLICATI === "true" && process.env.GESTORE_NOME && process.env.GESTORE_INDIRIZZO && process.env.GESTORE_EMAIL && (
          <div className="v-wrap v-micro" style={{ paddingBottom: 24, textAlign: "center" }}>
            <Link href="/termini">Termini del servizio</Link>
          </div>
        )}
      </body>
    </html>
  );
}
