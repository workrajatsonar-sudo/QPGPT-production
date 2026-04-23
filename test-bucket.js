const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ojvqdxtyvbzyartmyxuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdnFkeHR5dmJ6eWFydG15eHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzkyNTEsImV4cCI6MjA4NDkxNTI1MX0.OGKlA5_HxzxYhCJG2f2cgl_7qjvEoxBY-gfxlvOBNzE');

async function check() {
    const { data, error } = await supabase.from('files').select('file_path').limit(5);
    console.log("Files:", data);
    if (error) console.log("DB Error:", error);

    const { data: b, error: e } = await supabase.storage.getBucket('question-files');
    console.log("Bucket:", b || e);
}

check();
