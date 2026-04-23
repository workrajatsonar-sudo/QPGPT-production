
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ojvqdxtyvbzyartmyxuq.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdnFkeHR5dmJ6eWFydG15eHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzkyNTEsImV4cCI6MjA4NDkxNTI1MX0.OGKlA5_HxzxYhCJG2f2cgl_7qjvEoxBY-gfxlvOBNzE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cleans a file path so it never contains the bucket name as a prefix.
// e.g. 'question-files/uploaded/x.pdf' → 'uploaded/x.pdf'
//      '/uploaded/x.pdf'             → 'uploaded/x.pdf'
//      'uploaded/x.pdf'              → 'uploaded/x.pdf'
const getCleanPath = (path: string, bucket: string): string => {
  if (!path) return '';
  let cleanPath = path.replace(/^\/+/, ''); // strip leading slashes
  if (cleanPath.startsWith(bucket + '/')) {
    cleanPath = cleanPath.substring(bucket.length + 1);
  }
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
