import Gestione from "@/components/sistema/Gestione";
export const dynamic="force-dynamic";
export default function PaginaGestione(){return <Gestione raccoltaAttiva={process.env.TRAFFICO_ENABLED === "true"}/>;}
