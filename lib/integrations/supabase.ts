import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Variables serveur lues à l'exécution (pas de NEXT_PUBLIC_ : rien n'est exposé au navigateur).
// Les deux générations de clés sont acceptées : service role / anon (JWT) ou secret / publishable (sb_…).
const url = () => process.env.SUPABASE_URL;
const secretKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const publicKey = () => process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

/** Supabase est activé dès que l'URL et la clé secrète sont fournies. Sinon : mode local. */
export function supabaseEnabled(): boolean {
  return Boolean(url() && secretKey());
}

let admin: SupabaseClient | undefined;
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(url()!, secretKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Client « anon » côté serveur, uniquement pour vérifier un mot de passe. */
export function supabaseAnon(): SupabaseClient {
  return createClient(url()!, publicKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
