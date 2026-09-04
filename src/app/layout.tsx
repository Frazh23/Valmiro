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
      <body>{children}</body>
    </html>
  );
}
