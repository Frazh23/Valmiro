"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSessione } from "@/lib/sessione";
import Logo from "./Logo";

/**
 * Header unico dell'applicazione. Trasparente sopra l'hero, si posa su un vetro
 * smerigliato appena la pagina scorre. La navigazione punta solo a destinazioni
 * che esistono davvero: niente voci decorative.
 *
 * Sotto i 640 px le quattro voci non stanno in una riga senza tagliare «Accedi»:
 * restano il marchio, «Valuta» e un bottone «Menu» che apre le altre tre in un
 * pannello sotto la barra. Niente overflow nascosto: quello che non ci sta, si
 * apre.
 */
export default function Header() {
  const qui = usePathname();
  const { utente, profilo, accountAttivo } = useSessione();
  const [posato, setPosato] = useState(false);
  const [aperto, setAperto] = useState(false);
  const pannello = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const su = () => setPosato(window.scrollY > 8);
    su();
    addEventListener("scroll", su, { passive: true });
    return () => removeEventListener("scroll", su);
  }, []);
  /* il menu si chiude cambiando pagina, con Esc, o toccando fuori */
  useEffect(() => { setAperto(false); }, [qui]);
  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAperto(false); };
    const fuori = (e: MouseEvent) => { if (pannello.current && !pannello.current.contains(e.target as Node)) setAperto(false); };
    addEventListener("keydown", esc); addEventListener("mousedown", fuori);
    return () => { removeEventListener("keydown", esc); removeEventListener("mousedown", fuori); };
  }, [aperto]);

  const attivo = (p: string) => (qui === p || qui?.startsWith(p + "/") ? "on" : "");
  const etichettaAccount = utente
    ? profilo?.tipo === "agenzia"
      ? profilo.ragione_sociale || "Agenzia"
      : "Account"
    : accountAttivo
      ? "Accedi"
      : "Area personale";

  const voci = (
    <>
      <Link href="/valuta" className={attivo("/valuta")}>Valuta</Link>
      <Link href="/quartieri" className={attivo("/quartieri")}>Quartieri</Link>
      <Link href="/stime" className={attivo("/stime")}>Le mie stime</Link>
      <Link href="/accedi" className={`v-nav__cta ${attivo("/accedi")}`} aria-current={attivo("/accedi") ? "page" : undefined}>{etichettaAccount}</Link>
    </>
  );

  return (
    <header className={`v-header${posato || aperto ? " v-header--solid" : ""}`} ref={pannello}>
      <div className="v-wrap v-header__in">
        <Logo />
        <nav className="v-nav v-nav--wide" aria-label="Principale">{voci}</nav>
        <nav className="v-nav v-nav--compact" aria-label="Principale">
          <Link href="/valuta" className={attivo("/valuta")}>Valuta</Link>
          <button type="button" className="v-nav__menu" aria-expanded={aperto} aria-controls="v-menu" onClick={() => setAperto((a) => !a)}>
            <span aria-hidden="true" className="v-nav__burger" />
            Menu
          </button>
        </nav>
      </div>
      <div id="v-menu" className="v-menu" hidden={!aperto}>
        <nav className="v-wrap v-menu__in" aria-label="Menu">{voci}</nav>
      </div>
    </header>
  );
}
