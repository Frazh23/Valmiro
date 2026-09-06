export const EVENTI = ['avvio', 'indirizzo_ok', 'indirizzo_ko', 'import_ok', 'import_ko', 'passo_intento', 'passo_dove', 'passo_casa', 'passo_risultato', 'calcolo_ok', 'calcolo_ko', 'lavori_aperti', 'salvataggio_ok', 'salvataggio_ko', 'errore_ui'] as const;
export type Evento = typeof EVENTI[number];
export type Misura = { evento: Evento; intento: 'compro'|'vendo'|'nd'; formato:'mobile'|'desktop' };
export function validaMisura(x: unknown): Misura | null {
 if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
 const r=x as Record<string,unknown>;
 if (Object.keys(r).sort().join(',') !== 'evento,formato,intento') return null;
 if (!(EVENTI as readonly unknown[]).includes(r.evento) || !['compro','vendo','nd'].includes(String(r.intento)) || !['mobile','desktop'].includes(String(r.formato))) return null;
 return {evento:r.evento as Evento,intento:r.intento as Misura['intento'],formato:r.formato as Misura['formato']};
}
