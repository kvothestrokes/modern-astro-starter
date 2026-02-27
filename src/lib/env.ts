const requiredPublicVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'PUBLIC_SUPABASE_STORAGE_BUCKET'
] as const;

type PublicVar = (typeof requiredPublicVars)[number];

function readPublicVar(name: PublicVar): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: readPublicVar('PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readPublicVar('PUBLIC_SUPABASE_ANON_KEY'),
  storageBucket: readPublicVar('PUBLIC_SUPABASE_STORAGE_BUCKET')
};
