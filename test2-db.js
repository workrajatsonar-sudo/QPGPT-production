const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ojvqdxtyvbzyartmyxuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdnFkeHR5dmJ6eWFydG15eHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzkyNTEsImV4cCI6MjA4NDkxNTI1MX0.OGKlA5_HxzxYhCJG2f2cgl_7qjvEoxBY-gfxlvOBNzE');

async function test() {
    const cleanInput = 'admin';
    const { data: userEq, error: errEq } = await supabase.from('users').select('*').or(`email.eq.${cleanInput},username.eq.${cleanInput}`).maybeSingle();
    console.log('EQ:', userEq, errEq);

    const { data: userIlike, error: errIlike } = await supabase.from('users').select('*').or(`email.ilike.${cleanInput},username.ilike.${cleanInput}`).maybeSingle();
    console.log('ILIKE:', userIlike, errIlike);
}

test();
