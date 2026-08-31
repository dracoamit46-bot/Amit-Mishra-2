/**
 * Centralized environment configuration and detection.
 * 
 * Rules:
 * - VITE_APP_ENV === "production" -> PRODUCTION mode (uses Supabase, Netlify functions)
 * - VITE_APP_ENV !== "production" (or missing) -> DEVELOPMENT mode (Local / Mock / In-Memory)
 * - Never infer production from hostname or other heuristics.
 */

export type AppEnvironment = 'development' | 'production';

export const APP_ENV: AppEnvironment = 
  import.meta.env.VITE_APP_ENV === 'production' ? 'production' : 'development';

export const isProduction = (): boolean => {
  // If explicitly set to production, or if valid Supabase credentials are provided
  const config = getSupabaseConfig();
  return APP_ENV === 'production' || config.isConfigured;
};

export const isDevelopment = (): boolean => !isProduction();

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const url =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_URL) ||
    '';

  const anonKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_KEY) ||
    '';

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('placeholder') &&
    !anonKey.includes('placeholder') &&
    url.startsWith('http')
  );

  return {
    url,
    anonKey,
    isConfigured,
  };
};

export const validateProductionConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    if (!url) errors.push('Supabase URL (VITE_SUPABASE_URL or SUPABASE_URL) is required');
    if (!anonKey) errors.push('Supabase Anon Key (VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY) is required');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
};
