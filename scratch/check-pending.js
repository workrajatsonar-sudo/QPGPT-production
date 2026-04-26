const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ojvqdxtyvbzyartmyxuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdnFkeHR5dmJ6eWFydG15eHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzkyNTEsImV4cCI6MjA4NDkxNTI1MX0.OGKlA5_HxzxYhCJG2f2cgl_7qjvEoxBY-gfxlvOBNzE');

async function checkPendingFiles() {
    console.log('--- Checking Pending Files ---');
    const { data, error } = await supabase
        .from('files')
        .select(`
            id, 
            title, 
            approval_status, 
            visibility, 
            uploaded_by,
            users!uploaded_by(full_name)
        `)
        .eq('approval_status', 'pending');
    
    if (error) {
        console.error('Error fetching pending files:', error);
    } else {
        console.log(`Found ${data.length} pending files:`);
        console.log(JSON.stringify(data, null, 2));
    }
}

checkPendingFiles();
