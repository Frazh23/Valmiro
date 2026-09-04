import type { Metadata } from "next";
import "../styles/tokens.css";
import "./globals.css";
import "../styles/sistema.css";

export const metadata: Metadata = {
  title: "Stimami · quanto vale casa a Milano",
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
