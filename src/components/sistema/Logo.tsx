import Link from "next/link";

/**
 * Il marchio: la finestra ad arco con il montante, in verde, e la scritta in
 * Fraunces. Il simbolo e' SVG inline (scala a qualunque dimensione, eredita il
 * colore); la scritta e' testo vero, con gli stessi assi del file in
 * public/logo: opsz 144, SOFT 0, WONK 0. Le versioni per stampa e social stanno
 * in public/logo/, generate dallo stesso disegno (vedi il README li').
 */
export function Simbolo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size * 1.2} viewBox="0 -2 100 122" aria-hidden="true" focusable="false"
         fill="none" stroke="currentColor" strokeWidth="14" strokeLinejoin="round">
      <path d="M7 113V50A43 43 0 0 1 93 50V113Z" />
      <path d="M50 20V113" />
    </svg>
  );
}

/** Il logo completo. Nell'intestazione e' un link alla home con nome accessibile; altrove e' un'immagine. */
export default function Logo({ link = true, size = "md" }: { link?: boolean; size?: "sm" | "md" }) {
  const dentro = (
    <>
      <Simbolo className="v-logo__simbolo" size={size === "sm" ? 18 : 22} />
      <span className="v-logo__nome" aria-hidden="true">Valmiro</span>
    </>
  );
  const cls = `v-logo${size === "sm" ? " v-logo--sm" : ""}`;
  return link
    ? <Link href="/" className={cls} aria-label="Valmiro, torna alla home">{dentro}</Link>
    : <span className={cls} role="img" aria-label="Valmiro">{dentro}</span>;
}
