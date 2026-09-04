"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SEMESTRE } from "@/lib/data";
import { useSessione } from "@/lib/sessione";

export default function Testata({ badge }: { badge?: React.ReactNode }) {
  const qui = usePathname();
  const { utente, profilo, accountAttivo } = useSessione();
  const attivo = (p: string) => (qui?.startsWith(p) ? "on" : "");
  return (
    <div className="top">
      <Link href="/" className="brand">Vayl<span>o</span></Link>
      <nav className="nav-top">
        <Link href="/valuta" className={attivo("/valuta")}>Valuta</Link>
        <Link href="/stime" className={attivo("/stime")}>Le mie stime</Link>
        <Link href="/accedi" className={attivo("/accedi")}>
          {utente ? (profilo?.tipo === "agenzia" ? profilo.ragione_sociale || "Agenzia" : "Account") : accountAttivo ? "Entra" : "Area personale"}
        </Link>
        <span className="badge">{badge || <>Quotazioni <b>OMI</b> · {SEMESTRE}</>}</span>
      </nav>
    </div>
  );
}
