
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import bcrypt from 'npm:bcryptjs@2.4.3'

console.log("legacy-auth-login function started");

const getCorsHeaders = (origin: string | null) => {
  const allowList = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const allowOrigin = !origin
    ? '*'
    : allowList.length === 0 || allowList.includes(origin)
      ? origin
      : '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_AUTH_URL = SUPABASE_URL + '/auth/v1';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findLegacyUser(identifier, password) {
  // Try to find user by username or email
  const { data: user, error } = await supabase
    .from('users')
    .select('email, password, username, status')
    .or(`username.eq.${identifier},email.eq.${identifier}`)
    .maybeSingle();

  if (error) {
    console.log('DB error:', error.message);
    return { success: false, reason: 'db_error', message: error.message };
  }
  if (!user) {
    console.log('No user found for identifier:', identifier);
    return { success: false, reason: 'user_not_found', message: 'Invalid credentials: user not found' };
  }
  console.log('User found:', user.username || user.email);

  if (user.status !== 'active') {
    console.log('Account disabled for user:', user.username || user.email);
    return { success: false, reason: 'account_disabled', message: 'Invalid credentials: account disabled' };
  }

  if (!user.password) {
    console.log('User has NULL password:', user.username || user.email);
    return { success: false, reason: 'password_missing', message: 'Invalid credentials: password missing' };
  }

  let match = false;
  // Detect bcrypt hash by prefix
  if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
    console.log('Attempting bcrypt compare:', {
      identifier,
      inputPassword: password,
      storedHash: user.password
    });
    try {
      match = await bcrypt.compare(password, user.password);
      console.log('Checked bcrypt hash for user:', user.username || user.email, 'Result:', match);
    } catch (err) {
      console.log('Bcrypt compare error:', err.message);
      return { success: false, reason: 'bcrypt_error', message: 'Invalid credentials: bcrypt error' };
    }
  } else {
    console.log('Attempting plaintext compare:', {
      identifier,
      inputPassword: password,
      storedPassword: user.password
    });
    match = password === user.password;
    console.log('Checked plaintext password for user:', user.username || user.email, 'Result:', match);
  }

  if (!match) {
    console.log('Password mismatch for user:', user.username || user.email);
    return { success: false, reason: 'password_mismatch', message: 'Invalid credentials: password mismatch' };
  }
  console.log('Password match for user:', user.username || user.email);

  return { success: true, email: user.email, password };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      console.log('Missing identifier or password');
      return new Response(JSON.stringify({ error: 'Missing identifier or password.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await findLegacyUser(identifier, password);
    if (!result.success) {
      console.log('Legacy login failed:', result.message);
      return new Response(JSON.stringify({ error: result.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Migrate user to Supabase Auth
    // Try to sign up the user (idempotent: if already exists, will error)
    let migrated = false;
    let signupError = null;
    try {
      const signupRes = await fetch(`${SUPABASE_AUTH_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          email: result.email,
          password: result.password,
          email_confirm: true
        })
      });
      if (signupRes.ok) {
        migrated = true;
        console.log('User migrated to Supabase Auth:', result.email);
      } else {
        const signupData = await signupRes.json();
        signupError = signupData.error || signupData.msg || signupData.message;
        console.log('Supabase Auth migration error:', signupError);
      }
    } catch (err) {
      signupError = err.message;
      console.log('Supabase Auth migration exception:', err.message);
    }

    return new Response(JSON.stringify({
      email: result.email,
      migrated,
      signupError
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.log('Edge function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
