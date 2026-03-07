const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ojvqdxtyvbzyartmyxuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdnFkeHR5dmJ6eWFydG15eHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzkyNTEsImV4cCI6MjA4NDkxNTI1MX0.OGKlA5_HxzxYhCJG2f2cgl_7qjvEoxBY-gfxlvOBNzE');

async function test() {
    const { data, error } = await supabase.from('users').select('*').eq('role', 'admin');
    console.log('Admins in DB:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
}

test();
