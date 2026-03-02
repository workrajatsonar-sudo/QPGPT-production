
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ojvqdxtyvbzyartmyxuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdnFkeHR5dmJ6eWFydG15eHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzkyNTEsImV4cCI6MjA4NDkxNTI1MX0.OGKlA5_HxzxYhCJG2f2cgl_7qjvEoxBY-gfxlvOBNzE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getCleanPath = (path: string, bucket: string) => {
  if (!path) return '';
  // 1. Clean leading slashes
  let cleanPath = path.replace(/^\/+/, '');
  
  // 2. Remove bucket name from path if present (to avoid duplication like question-files/question-files/...)
  if (cleanPath.startsWith(bucket + '/')) {
    cleanPath = cleanPath.substring(bucket.length + 1);
  }
  return cleanPath;
};

export const getStorageUrl = (path: string, bucket: string = 'question-files') => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  const cleanPath = getCleanPath(path, bucket);
  
  // 3. Use the SDK method to ensure correct base URL construction matching the project config
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
  
  return data.publicUrl;
};

export const downloadFile = async (path: string, bucket: string = 'question-files') => {
  const cleanPath = getCleanPath(path, bucket);
  
  console.log('Bucket:', bucket);
  console.log('Path:', cleanPath);

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(cleanPath);

  if (error) {
    console.error('Download error:', error.message);
    alert('Failed to download file: ' + error.message);
    return;
  }

  if (data) {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanPath.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};
