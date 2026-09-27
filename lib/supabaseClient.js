import { createBrowserClient } from '@supabase/ssr';

// A single shared Supabase client for the browser.
// This uses the public "anon" key, which is safe to expose —
// all real security is enforced by the Row Level Security (RLS)
// policies defined in schema.sql, not by hiding this key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Hard limits, mirrored from the Supabase Storage bucket config.
// Keeping these in one place means the upload form, the admin
// screen, and the bucket policy all agree on the same numbers.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_INTRO_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB, adjust later if needed
export const PHOTO_BUCKET = 'actor-photos';
export const VIDEO_BUCKET = 'actor-videos';
export const LOCATION_BUCKET = 'location-photos';
