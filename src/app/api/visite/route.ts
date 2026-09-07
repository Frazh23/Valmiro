import {raccogliVisita} from '@/lib/traffico-server';
export const runtime='nodejs';
export async function POST(req:Request){return raccogliVisita(req,{attivo:process.env.TRAFFICO_ENABLED,origine:process.env.APP_ORIGIN,url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY});}
