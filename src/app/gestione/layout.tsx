import type { Metadata } from "next";

/** Non e' una pagina pubblica: fuori dai motori di ricerca. Il contenuto lo protegge
 *  comunque il database, che risponde solo a chi e' in `amministratori`. */
export const metadata: Metadata = {
  title: "Gestione · Valmiro",
  robots: { index: false, follow: false },
};

export default function LayoutGestione({ children }: { children: React.ReactNode }) {
  return children;
}
