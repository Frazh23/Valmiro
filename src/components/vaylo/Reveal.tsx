"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Rivela il contenuto quando entra nel viewport.
 * Se l'utente ha chiesto meno movimento, o se IntersectionObserver non c'e',
 * il contenuto e' visibile da subito: l'animazione non e' mai una condizione
 * per leggere la pagina.
 */
export default function Reveal({
  children, delay = 0, as: Tag = "div", className = "",
}: {
  children: React.ReactNode; delay?: number;
  as?: "div" | "section" | "li" | "article"; className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const n = el.current;
    if (!n || typeof IntersectionObserver === "undefined") { setVisto(true); return; }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setVisto(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect(); } },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );
    io.observe(n);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as any;
  return (
    <Comp
      ref={el}
      className={`v-reveal ${className}`}
      data-shown={visto || undefined}
      style={delay ? ({ ["--reveal-delay" as any]: `${delay}ms` }) : undefined}
    >
      {children}
    </Comp>
  );
}
