// Solo amministrazione locale: nessun endpoint di lettura pubblico.
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Configurazione amministrativa non disponibile');
const res=await fetch(`${url}/rest/v1/eventi_giornalieri?select=*&order=giorno.desc&limit=1000`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
if(!res.ok) throw new Error('Rapporto non disponibile');
console.log('Conteggi di eventi, non utenti unici. Massimo 1.000 aggregati recenti. Non equivalgono a tassi certi di abbandono.');
console.table(await res.json());
