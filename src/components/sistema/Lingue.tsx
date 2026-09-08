"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Il cambio lingua, piccolo, in fondo a ogni pagina.
 *
 * Non porta a una traduzione del sito: porta a due pagine scritte a mano che
 * spiegano a chi arriva da fuori che cosa fa Valmiro, da dove vengono i numeri e
 * qual e' il vocabolario del modulo italiano. Chiamarlo altrimenti — una
 * bandierina, «EN | FR» — prometterebbe un sito tradotto che non c'e'.
 *
 * I nomi delle lingue stanno nella loro lingua: e' cosi' che li riconosce chi li
 * cerca. La voce della pagina in cui si e' gia' non e' un link.
 */
const LINGUE = [
  { href: "/", nome: "Italiano", lang: "it" },
  { href: "/en", nome: "English", lang: "en" },
  { href: "/fr", nome: "Français", lang: "fr" },
];

export default function Lingue() {
  const qui = usePathname();
  /* «Italiano» e' la voce attiva su tutto il sito tranne le due pagine straniere */
  const attiva = qui === "/en" ? "/en" : qui === "/fr" ? "/fr" : "/";

  return (
    <nav className="v-lingue" aria-label="Lingua">
      {LINGUE.map((l, n) => (
        <span key={l.href}>
          {n > 0 && <i aria-hidden="true"> · </i>}
          {l.href === attiva
            ? <b lang={l.lang} aria-current="true">{l.nome}</b>
            : <Link href={l.href} lang={l.lang} hrefLang={l.lang}>{l.nome}</Link>}
        </span>
      ))}
    </nav>
  );
}
