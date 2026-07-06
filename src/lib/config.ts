function requireEnv(key: string): string {
  const val = import.meta.env[key] as string | undefined
  if (!val) {
    if (import.meta.env.DEV) {
      return `__MISSING_${key}__`
    }
    throw new Error(`[config] Missing required environment variable: ${key}`)
  }
  return val
}

export const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')
export const APP_NAME = 'GYMOS'
export const STORAGE_BUCKET = 'member-photos'
export const APP_VERSION = '2.0.0'
