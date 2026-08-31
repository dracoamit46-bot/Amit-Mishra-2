import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isProduction, getSupabaseConfig } from './config/env';

const config = getSupabaseConfig();

export const isSupabaseConfigured = config.isConfigured;

// Fail-safe client initialization:
// In development, we use dummy values if credentials aren't provided because
// all queries route to local mock storage.
// In production, real credentials are used.


export const supabase: SupabaseClient = createClient(
  config.url || 'https://placeholder.supabase.co',
  config.anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: isProduction(),
      autoRefreshToken: isProduction(),
      detectSessionInUrl: isProduction(),
    },
  }
);

/**
 * Helper to normalize phone numbers into standard digits
 * Strips non-digits and removes leading country code 91 if 12 digits
 */
export function normalizePhoneDigits(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean.slice(2);
  }
  return clean;
}

/**
 * Helper to convert a phone number into the internal hidden email format
 * Example: "+91 98765 00001" -> "9876500001@hostelops.internal"
 */
export function formatInternalEmail(phone: string): string {
  const cleanDigits = normalizePhoneDigits(phone);
  return `${cleanDigits || 'user'}@hostelops.internal`;
}

/**
 * Helper to extract raw digits from an internal email
 * Example: "9876500001@hostelops.internal" -> "9876500001"
 */
export function extractPhoneDigitsFromEmail(email: string): string {
  if (!email) return '';
  const [localPart] = email.split('@');
  return normalizePhoneDigits(localPart);
}
