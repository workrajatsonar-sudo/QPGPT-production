
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase environment variables! Check your .env.local file.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cleans a file path so it never contains the bucket name as a prefix.
// e.g. 'question-files/uploaded/x.pdf' → 'uploaded/x.pdf'
//      '/uploaded/x.pdf'             → 'uploaded/x.pdf'
//      'uploaded/x.pdf'              → 'uploaded/x.pdf'
const getCleanPath = (path: string, bucket: string): string => {
  if (!path) return '';

  // If a full Supabase storage URL was saved, extract only the object path.
  const storageUrlMarker = `/storage/v1/object/public/${bucket}/`;
  const signedUrlMarker = `/storage/v1/object/sign/${bucket}/`;
  const publicIndex = path.indexOf(storageUrlMarker);
  const signedIndex = path.indexOf(signedUrlMarker);

  let cleanPath = path;
  if (publicIndex >= 0) {
    cleanPath = path.substring(publicIndex + storageUrlMarker.length);
  } else if (signedIndex >= 0) {
    cleanPath = path.substring(signedIndex + signedUrlMarker.length);
    cleanPath = cleanPath.split('?')[0];
  }

  // Normalize Windows-style paths and strip leading slashes.
  cleanPath = cleanPath.replace(/\\/g, '/').replace(/^\/+/, '');

  if (cleanPath.startsWith(bucket + '/')) {
    cleanPath = cleanPath.substring(bucket.length + 1);
  }

  // Decode URL-encoded object paths once, then re-trim leading slashes.
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch {
    // Ignore malformed sequences and use the raw path.
  }
  cleanPath = cleanPath.replace(/^\/+/, '');

  return cleanPath;
};

// Returns a public URL string for a file in a public Supabase bucket.
// NOTE: question-files is a PUBLIC bucket, so no auth is needed.
export const getStorageUrl = (path: string, bucket: string = 'question-files'): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = getCleanPath(path, bucket);
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
  return data.publicUrl;
};

// Downloads a file by fetching it as a blob (triggers browser's Save dialog).
// Falls back to opening in a new tab if blob fetch fails.
// Works with PUBLIC buckets using the anon key — no signed URLs needed.
export const downloadFile = async (path: string, bucket: string = 'question-files'): Promise<void> => {
  if (!path) {
    alert('No file path provided.');
    return;
  }

  // If already a full URL, open directly
  if (path.startsWith('http')) {
    window.open(path, '_blank');
    return;
  }

  const cleanPath = getCleanPath(path, bucket);

  // Build the public URL — works for PUBLIC buckets without authentication
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
  const publicUrl = data.publicUrl;

  console.log('[Storage] Downloading file:', cleanPath);
  console.log('[Storage] Public URL:', publicUrl);

  try {
    const response = await fetch(publicUrl);

    if (!response.ok) {
      // Fetch failed (e.g. file deleted) — open URL in new tab as fallback
      console.warn('[Storage] Fetch failed:', response.status, '— opening in new tab');
      window.open(publicUrl, '_blank');
      return;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = cleanPath.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    console.log('[Storage] Download complete!');

  } catch (err: any) {
    console.error('[Storage] Download error:', err);
    // Final fallback — open in new tab
    window.open(publicUrl, '_blank');
  }
};
