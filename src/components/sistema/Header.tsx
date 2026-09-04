"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessione } from "@/lib/sessione";

/**
 * Header unico dell'applicazione. Trasparente sopra l'hero, si posa su un vetro
 * smerigliato appena la pagina scorre. La navigazione punta solo a destinazioni
 * che esistono davvero: niente voci decorative.
 */
export default function Header() {
  const qui = usePathname();
  const { utente, profilo, accountAttivo } = useSessione();
  const [posato, setPosato] = useState(false);

  useEffect(() => {
    const su = () => setPosato(window.scrollY > 8);
    su();
    addEventListener("scroll", su, { passive: true });
    return () => removeEventListener("scroll", su);
  }, []);

  const attivo = (p: string) => (qui === p || qui?.startsWith(p + "/") ? "on" : "");
  const etichettaAccount = utente
    ? profilo?.tipo === "agenzia"
      ? profilo.ragione_sociale || "Agenzia"
      : "Account"
    : accountAttivo
      ? "Accedi"
      : "Area personale";

  return (
    <header className={`v-header${posato ? " v-header--solid" : ""}`}>
      <div className="v-wrap v-header__in">
        <Link href="/" className="v-brand" aria-label="Valmiro, torna alla home">
          Valmir<span>o</span>
        </Link>
        <nav className="v-nav" aria-label="Principale">
          <Link href="/valuta" className={attivo("/valuta")}>Valuta</Link>
          <Link href="/quartieri" className={attivo("/quartieri")}>Quartieri</Link>
          <Link href="/stime" className={`v-nav__hide ${attivo("/stime")}`}>Le mie stime</Link>
          <Link href="/accedi" className={`v-nav__cta ${attivo("/accedi")}`}>{etichettaAccount}</Link>
        </nav>
      </div>
    </header>
  );
}
