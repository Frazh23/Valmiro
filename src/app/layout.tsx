import type { Metadata } from "next";
import "../styles/tokens.css";
import "./globals.css";
import "../styles/vaylo.css";

export const metadata: Metadata = {
  title: "Vaylo · quanto vale casa a Milano",
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
