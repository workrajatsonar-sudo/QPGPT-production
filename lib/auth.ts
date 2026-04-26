import { supabase } from './supabase';
import { UserProfile } from '../types';
import bcrypt from 'bcryptjs';

const USER_CACHE_KEY = 'qb_user';
const LEGACY_SESSION_KEY = 'qb_legacy_session';
const ENABLE_LEGACY_LOGIN_EDGE = import.meta.env.VITE_ENABLE_LEGACY_LOGIN_EDGE === 'true';
const PROFILE_PASSWORD_PLACEHOLDER = '__managed_by_supabase_auth__';
const ENABLE_LOCAL_LEGACY_MIGRATION = import.meta.env.VITE_ENABLE_LOCAL_LEGACY_MIGRATION !== 'false';
const ENABLE_LOCAL_LEGACY_SESSION_FALLBACK = import.meta.env.VITE_ENABLE_LOCAL_LEGACY_SESSION_FALLBACK !== 'false';
const ENABLE_PROD_LEGACY_SESSION_FALLBACK = import.meta.env.VITE_ENABLE_PROD_LEGACY_SESSION_FALLBACK === 'true';

const PROFILE_COLUMNS = `
  id,
  full_name,
  display_name,
  username,
  email,
  role,
  grade_year,
  level_of_study,
  course_stream,
  subjects_of_interest,
  exam_type,
  status,
  created_at
`;

type StudentSignupInput = {
  full_name: string;
  email: string;
  username: string;
  password: string;
  grade_year?: string;
  level_of_study?: string;
  course_stream?: string;
  subjects_of_interest?: string[];
  exam_type?: string;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizeRole = (role?: string | null) => {
  const lower = (role || 'student').trim().toLowerCase();
  return lower === 'admin' || lower === 'teacher' ? lower : 'student';
};

export const sanitizeProfile = (profile: any): UserProfile => ({
  id: profile.id,
  full_name: profile.full_name || '',
  display_name: profile.display_name || '',
  username: profile.username || '',
  email: profile.email || '',
  role: normalizeRole(profile.role),
  grade_year: profile.grade_year || '',
  level_of_study: profile.level_of_study || '',
  course_stream: profile.course_stream || '',
  subjects_of_interest: Array.isArray(profile.subjects_of_interest) ? profile.subjects_of_interest : [],
  exam_type: profile.exam_type || '',
  status: profile.status || 'active',
  created_at: profile.created_at,
});

const broadcastAuthChange = () => {
  window.dispatchEvent(new Event('auth-change'));
};

const isLocalHost = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const canUseLegacySessionFallback = () => {
  if (!ENABLE_LOCAL_LEGACY_SESSION_FALLBACK) return false;
  return isLocalHost() || ENABLE_PROD_LEGACY_SESSION_FALLBACK;
};

export const clearCachedProfile = () => {
  const hadCachedUser = localStorage.getItem(USER_CACHE_KEY) !== null;
  const hadSessionToken = localStorage.getItem('qb_session_token') !== null;
  const hadLegacySession = localStorage.getItem(LEGACY_SESSION_KEY) !== null;

  localStorage.removeItem(USER_CACHE_KEY);
  localStorage.removeItem('qb_session_token');
  localStorage.removeItem(LEGACY_SESSION_KEY);

  if (hadCachedUser || hadSessionToken || hadLegacySession) {
    broadcastAuthChange();
  }
};

export const cacheProfile = (profile: UserProfile | null) => {
  if (!profile) {
    clearCachedProfile();
    return;
  }

  const nextSerialized = JSON.stringify(profile);
  const previousSerialized = localStorage.getItem(USER_CACHE_KEY);
  const hadSessionToken = localStorage.getItem('qb_session_token') !== null;
  const hadLegacySession = localStorage.getItem(LEGACY_SESSION_KEY) !== null;

  localStorage.setItem(USER_CACHE_KEY, nextSerialized);
  localStorage.removeItem('qb_session_token');
  localStorage.removeItem(LEGACY_SESSION_KEY);

  const profileChanged = previousSerialized !== nextSerialized;
  if (profileChanged || hadSessionToken || hadLegacySession) {
    broadcastAuthChange();
  }
};

export const getCachedProfile = (): UserProfile | null => {
  const raw = localStorage.getItem(USER_CACHE_KEY);
  if (!raw) return null;

  try {
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    localStorage.removeItem(USER_CACHE_KEY);
    return null;
  }
};

export const resolveProfileByEmail = async (email?: string | null): Promise<UserProfile | null> => {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  return data ? sanitizeProfile(data) : null;
};

const resolveLoginEmail = async (identifier: string): Promise<string | null> => {
  const cleanInput = identifier.trim().replace(/["']/g, '');
  if (!cleanInput) return null;

  const { data: emailMatch, error: emailError } = await supabase
    .from('users')
    .select('email, status')
    .eq('email', cleanInput)
    .maybeSingle();

  if (emailError) throw emailError;
  if (emailMatch?.status === 'disabled') {
    throw new Error('Account has been disabled. Contact support.');
  }
  if (emailMatch?.email) return emailMatch.email;

  const { data: usernameMatch, error: usernameError } = await supabase
    .from('users')
    .select('email, status')
    .eq('username', cleanInput)
    .maybeSingle();

  if (usernameError) throw usernameError;
  if (usernameMatch?.status === 'disabled') {
    throw new Error('Account has been disabled. Contact support.');
  }

  return usernameMatch?.email || null;
};

const migrateLegacyLoginIfNeeded = async (identifier: string, password: string) => {
  const { data, error } = await supabase.functions.invoke('legacy-auth-login', {
    body: { identifier, password },
  });

  if (error) {
    throw new Error(error.message || 'Legacy account migration failed.');
  }

  if (!data?.email) {
    throw new Error(data?.error || 'Legacy account migration failed.');
  }

  return data.email as string;
};

const isBcryptHash = (value: string) =>
  value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');

const verifyLegacyPassword = async (storedPassword: string, inputPassword: string) => {
  if (!storedPassword || storedPassword === PROFILE_PASSWORD_PLACEHOLDER) return false;
  if (isBcryptHash(storedPassword)) {
    try {
      return await bcrypt.compare(inputPassword, storedPassword);
    } catch {
      return false;
    }
  }
  return storedPassword === inputPassword;
};

const getLegacyUserByIdentifier = async (identifier: string) => {
  const cleanIdentifier = identifier.trim();
  const { data: byEmail } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS + ', password')
    .ilike('email', cleanIdentifier)
    .maybeSingle();

  if (byEmail) return byEmail;

  const { data: byUsername } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS + ', password')
    .ilike('username', cleanIdentifier)
    .maybeSingle();

  return byUsername || null;
};

const migrateLegacyLoginLocallyIfNeeded = async (identifier: string, password: string) => {
  if (!ENABLE_LOCAL_LEGACY_MIGRATION) {
    throw new Error('Legacy login migration is disabled.');
  }

  const legacyUser = await getLegacyUserByIdentifier(identifier);
  if (!legacyUser?.email) {
    throw new Error('Invalid credentials');
  }

  if (legacyUser.status === 'disabled') {
    throw new Error('Account has been disabled. Contact support.');
  }

  const storedPassword = legacyUser.password || '';
  if (!storedPassword || storedPassword === PROFILE_PASSWORD_PLACEHOLDER) {
    throw new Error('Invalid credentials');
  }

  const valid = await verifyLegacyPassword(storedPassword, password);

  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const normalizedLegacyEmail = (legacyUser.email || '').trim().toLowerCase();
  if (!normalizedLegacyEmail) {
    throw new Error('Invalid credentials');
  }

  const signUpResult = await supabase.auth.signUp({
    email: normalizedLegacyEmail,
    password,
    options: {
      data: {
        full_name: legacyUser.full_name || '',
        username: legacyUser.username || '',
        role: legacyUser.role || 'student',
      },
    },
  });

  // Ignore "already exists / rate limit" style responses and proceed to sign-in.
  if (signUpResult.error) {
    const msg = signUpResult.error.message?.toLowerCase() || '';
    const ignorable =
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      msg.includes('rate limit');
    if (!ignorable) {
      throw signUpResult.error;
    }
  }

  return normalizedLegacyEmail;
};

const tryLocalLegacySessionFallback = async (identifier: string, password: string): Promise<UserProfile | null> => {
  if (!canUseLegacySessionFallback()) return null;

  const legacyUser = await getLegacyUserByIdentifier(identifier);
  if (!legacyUser || legacyUser.status === 'disabled') return null;

  const valid = await verifyLegacyPassword(legacyUser.password || '', password);
  if (!valid) return null;

  const safeProfile = sanitizeProfile(legacyUser);
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(safeProfile));
  localStorage.setItem(LEGACY_SESSION_KEY, '1');
  localStorage.removeItem('qb_session_token');
  broadcastAuthChange();
  return safeProfile;
};

export const signInWithIdentifier = async (
  identifier: string,
  password: string
): Promise<UserProfile> => {
  const cleanIdentifier = identifier.trim().replace(/["']/g, '');
  let loginEmail: string | null = null;
  let signInError: Error | null = null;

  try {
    loginEmail = await resolveLoginEmail(cleanIdentifier);
  } catch {
    // If profile lookup fails (e.g. RLS/policy mismatch), still try direct email login.
    if (cleanIdentifier.includes('@')) {
      loginEmail = cleanIdentifier;
    }
  }

  if (loginEmail) {
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (!error) {
      const profile = await syncProfileFromSession();
      if (!profile) throw new Error('Signed in, but your profile could not be loaded.');
      return profile;
    }

    signInError = error;
  }

  const shouldTryLegacyMigration =
    (!loginEmail || /invalid login credentials|email not confirmed|invalid_grant/i.test(signInError?.message || ''));

  if (shouldTryLegacyMigration) {
    try {
      if (ENABLE_LEGACY_LOGIN_EDGE) {
        try {
          loginEmail = await migrateLegacyLoginIfNeeded(cleanIdentifier, password);
        } catch {
          // If edge invoke is unavailable in local/dev, fall back to local migration path.
          loginEmail = await migrateLegacyLoginLocallyIfNeeded(cleanIdentifier, password);
        }
      } else {
        loginEmail = await migrateLegacyLoginLocallyIfNeeded(cleanIdentifier, password);
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        throw new Error(error.message || 'Login failed');
      }

      const profile = await syncProfileFromSession();
      if (!profile) throw new Error('Signed in, but your profile could not be loaded.');
      return profile;
    } catch (legacyError: any) {
      const localFallbackProfile = await tryLocalLegacySessionFallback(cleanIdentifier, password);
      if (localFallbackProfile) return localFallbackProfile;

      // Do not surface raw invoke transport errors to users.
      if (signInError) {
        throw new Error(signInError.message || 'Invalid credentials');
      }
      throw new Error(legacyError?.message || 'Login failed');
    }
  }

  if (!ENABLE_LEGACY_LOGIN_EDGE && !loginEmail) {
    throw new Error('Invalid credentials');
  }

  throw signInError || new Error('Invalid credentials');
};

export const signUpStudent = async (input: StudentSignupInput) => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim();
  const normalizedFullName = input.full_name.trim();

  if (!normalizedFullName) {
    throw new Error('Full name is required.');
  }
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!normalizedUsername) {
    throw new Error('Username is required.');
  }
  if (!input.password || input.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  const hashedProfilePassword = await bcrypt.hash(input.password, 10);

  const profilePayload = {
    full_name: normalizedFullName,
    display_name: normalizedFullName,
    username: normalizedUsername,
    email: normalizedEmail,
    // Keep legacy table compatibility while avoiding plaintext password storage.
    password: hashedProfilePassword,
    role: 'student',
    status: 'active',
    grade_year: input.grade_year || null,
    level_of_study: input.level_of_study || null,
    course_stream: input.course_stream || null,
    exam_type: input.exam_type || null,
    subjects_of_interest: input.subjects_of_interest?.length ? input.subjects_of_interest : null,
  };

  // Best-effort duplicate checks. Do not hard-fail signup if policies block reads.
  try {
    const { data: byEmail } = await supabase
      .from('users')
      .select('id, email, username, password')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (byEmail) {
      const isValidLegacy = await verifyLegacyPassword(byEmail.password || '', input.password);
      if (isValidLegacy) {
        const profile = await signInWithIdentifier(normalizedEmail, input.password);
        return { profile, needsEmailVerification: false };
      }
      throw new Error('Account already exists for this email. Please log in.');
    }

    const { data: byUsername } = await supabase
      .from('users')
      .select('id')
      .ilike('username', normalizedUsername)
      .maybeSingle();

    if (byUsername) {
      throw new Error('Username already taken. Please choose another username.');
    }
  } catch (dupCheckErr: any) {
    const duplicateMessage = (dupCheckErr?.message || '').toLowerCase();
    const isKnownDuplicate =
      duplicateMessage.includes('already exists') ||
      duplicateMessage.includes('already taken') ||
      duplicateMessage.includes('already registered') ||
      duplicateMessage.includes('please log in');

    if (isKnownDuplicate) {
      throw dupCheckErr;
    }
  }

  let authData: any = null;
  const signUpResult = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      data: {
        full_name: normalizedFullName,
        username: normalizedUsername,
        role: 'student',
      },
    },
  });

  authData = signUpResult.data;
  const authError = signUpResult.error;

  if (authError) {
    const msg = authError.message?.toLowerCase() || '';
    const isRateLimited = msg.includes('rate limit');
    const isAlreadyRegistered = msg.includes('already registered') || msg.includes('user already exists');
    const isEmailNotConfirmed = msg.includes('email not confirmed');
    const isInvalidEmail = msg.includes('email address') && msg.includes('invalid');

    // Supabase can rate-limit emails even when a prior signup already created the auth user.
    // In those cases, try signing in directly so users aren't blocked.
    if (isRateLimited || isAlreadyRegistered || isEmailNotConfirmed) {
      const signInAttempt = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: input.password,
      });

      if (!signInAttempt.error) {
        authData = { session: signInAttempt.data.session };
      } else if (isRateLimited) {
        authData = { session: null };
      } else {
        throw authError;
      }
    } else if (isInvalidEmail) {
      throw new Error('Email address is invalid. Please remove spaces and use a valid format like name@example.com.');
    } else {
      // Localhost fallback: create legacy-style local account so development is not blocked
      // by Auth provider limits/configuration errors.
      if (isLocalHost()) {
        const { data: localProfileRow, error: localProfileError } = await supabase
          .from('users')
          .upsert(
            {
              ...profilePayload,
            },
            { onConflict: 'email' }
          )
          .select(PROFILE_COLUMNS)
          .single();

        if (localProfileError) {
          const localMsg = localProfileError.message?.toLowerCase() || '';
          if (localMsg.includes('users_username_key')) {
            throw new Error('Username already taken. Please choose another username.');
          }
          if (localMsg.includes('users_email_key')) {
            throw new Error('Account already exists for this email. Please log in.');
          }
          throw localProfileError;
        }

        const safeProfile = sanitizeProfile(localProfileRow);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(safeProfile));
        localStorage.setItem(LEGACY_SESSION_KEY, '1');
        localStorage.removeItem('qb_session_token');
        broadcastAuthChange();
        return { profile: safeProfile, needsEmailVerification: false };
      }

      throw authError;
    }
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('users')
    .upsert(profilePayload, { onConflict: 'email' })
    .select(PROFILE_COLUMNS)
    .single();

  if (profileError) {
    const profileMsg = profileError.message?.toLowerCase() || '';
    if (profileMsg.includes('users_username_key')) {
      throw new Error('Username already taken. Please choose another username.');
    }
    if (profileMsg.includes('users_email_key')) {
      throw new Error('Account already exists for this email. Please log in.');
    }
    throw profileError;
  }

  if (authData?.session) {
    const safeProfile = sanitizeProfile(profileRow);
    cacheProfile(safeProfile);
    return { profile: safeProfile, needsEmailVerification: false };
  }

  // Local/dev UX fallback:
  // if Auth session is not returned (email confirmation / rate-limit edge),
  // keep user unblocked by creating a local legacy session.
  if (isLocalHost()) {
    const safeProfile = sanitizeProfile(profileRow);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(safeProfile));
    localStorage.setItem(LEGACY_SESSION_KEY, '1');
    localStorage.removeItem('qb_session_token');
    broadcastAuthChange();
    return { profile: safeProfile, needsEmailVerification: false };
  }

  return { profile: sanitizeProfile(profileRow), needsEmailVerification: true };
};

export const syncProfileFromSession = async (): Promise<UserProfile | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (canUseLegacySessionFallback() && localStorage.getItem(LEGACY_SESSION_KEY) === '1') {
      const cached = getCachedProfile();
      if (cached) return cached;
    }
    clearCachedProfile();
    return null;
  }

  const authUser = data.user;
  if (!authUser?.email) {
    if (canUseLegacySessionFallback() && localStorage.getItem(LEGACY_SESSION_KEY) === '1') {
      const cached = getCachedProfile();
      if (cached) return cached;
    }
    clearCachedProfile();
    return null;
  }

  const profile = await resolveProfileByEmail(authUser.email);

  if (!profile) {
    await supabase.auth.signOut();
    clearCachedProfile();
    return null;
  }

  if (profile.status === 'disabled') {
    await supabase.auth.signOut();
    clearCachedProfile();
    throw new Error('Account has been disabled. Contact support.');
  }

  cacheProfile(profile);
  return profile;
};

export const signOutUser = async () => {
  await supabase.auth.signOut();
  clearCachedProfile();
};
