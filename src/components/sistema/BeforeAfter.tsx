"use client";
import { useState } from "react";
import PropertyVisual, { type Foto } from "./PropertyVisual";

/**
 * Prima / dopo con maniglia trascinabile.
 * Le immagini definitive non ci sono ancora: finche' `prima` e `dopo` non
 * ricevono il nome di una foto di public/hero, il componente mostra la composizione disegnata con due
 * trattamenti diversi. L'architettura e' gia' quella giusta — quando arrivano
 * le foto si passano due stringhe e non cambia altro.
 * L'input range sotto rende l'interazione utilizzabile da tastiera e su mobile.
 */
export default function BeforeAfter({
  prima, dopo, etichettaPrima = "Oggi", etichettaDopo = "Dopo i lavori",
}: { prima?: Foto; dopo?: Foto; etichettaPrima?: string; etichettaDopo?: string }) {
  const [taglio, setTaglio] = useState(50);

  return (
    <div className="v-ba" style={{ ["--split" as any]: `${taglio}%` }}>
      <div className="v-ba__layer">
        <PropertyVisual foto={prima} wide alt={etichettaPrima} />
      </div>
      <div className="v-ba__layer v-ba__layer--after" style={{ filter: "saturate(1.12) brightness(1.06)" }}>
        <PropertyVisual foto={dopo} wide alt={etichettaDopo} />
      </div>

      <div className="v-ba__handle" aria-hidden="true">
        <span className="v-ba__grip">↔</span>
      </div>
      <span className="v-ba__tag v-ba__tag--l">{etichettaPrima}</span>
      <span className="v-ba__tag v-ba__tag--r">{etichettaDopo}</span>

      <input
        type="range" min={0} max={100} value={taglio}
        onChange={(e) => setTaglio(Number(e.target.value))}
        aria-label={`Confronto ${etichettaPrima} / ${etichettaDopo}`}
      />
    </div>
  );
}
