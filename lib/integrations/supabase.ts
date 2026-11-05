import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Variables serveur lues à l'exécution (pas de NEXT_PUBLIC_ : rien n'est exposé au navigateur).
const url = () => process.env.SUPABASE_URL;

/** Supabase est activé dès que l'URL et la clé service sont fournies. Sinon : mode local. */
export function supabaseEnabled(): boolean {
  return Boolean(url() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let admin: SupabaseClient | undefined;
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(url()!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Client « anon » côté serveur, uniquement pour vérifier un mot de passe. */
export function supabaseAnon(): SupabaseClient {
  return createClient(url()!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
