import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { resolveProfileByEmail, cacheProfile, clearCachedProfile } from '../lib/auth';

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);

  const redirectToAppRoute = (path: string) => {
    window.location.replace(`${window.location.origin}/#${path}`);
  };

  useEffect(() => {
    const handleCallback = async () => {
      console.log('AuthCallback: Processing OAuth callback...');
      setError(null);

      try {
        const currentUrl = new URL(window.location.href);
        const searchParams = currentUrl.searchParams;
        const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''));

        const providerError =
          searchParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');

        if (providerError) {
          console.error('AuthCallback: Provider returned an error:', providerError);
          setError(providerError);
          setTimeout(() => redirectToAppRoute('/login'), 2500);
          return;
        }

        const authCode = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (authCode) {
          console.log('AuthCallback: Exchanging OAuth code for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            console.warn('AuthCallback: Code exchange failed, will continue checking for existing session:', exchangeError);
          }
        } else if (accessToken && refreshToken) {
          console.log('AuthCallback: Restoring session from OAuth tokens...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('AuthCallback: Token session restore failed:', sessionError);
            setError(sessionError.message || 'Failed to restore Google session.');
            setTimeout(() => redirectToAppRoute('/login'), 2500);
            return;
          }
        }

        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        let sessionData: any = null;
        let sessionError: any = null;

        // Give Supabase a few chances to finish restoring the session,
        // especially when it already auto-consumed the OAuth code.
        for (let attempt = 0; attempt < 5; attempt++) {
          const sessionResult = await supabase.auth.getSession();
          sessionData = sessionResult.data;
          sessionError = sessionResult.error;

          console.log(`AuthCallback: getSession attempt ${attempt + 1}:`, sessionData, sessionError);

          if (sessionData?.session?.user || sessionError) {
            break;
          }

          await wait(400);
        }

        if (sessionError) {
          console.error('AuthCallback: Session error:', sessionError);
          setError(sessionError.message);
          return;
        }

          // Helper to process OAuth user
          const processOAuthUser = async (authUser: any) => {
            const profile = await resolveProfileByEmail(authUser.email);

            if (profile) {
              cacheProfile(profile);
              redirectToAppRoute(`/dashboard/${profile.role || 'student'}`);
              return true;
            }

            await supabase.auth.signOut();
            clearCachedProfile();
            setError('Your account was not found. Please create an account first.');
            setTimeout(() => redirectToAppRoute('/signup'), 2200);
            return false;
          };

          if (sessionData?.session?.user) {
            console.log('AuthCallback: Session found for', sessionData.session.user.email);
            const success = await processOAuthUser(sessionData.session.user);
            if (success) return;
          } else {
            console.log('AuthCallback: No session found in getSession');
            // Try to get the user directly
            let userData: any = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              const result = await supabase.auth.getUser();
              userData = result.data;
              console.log(`AuthCallback: getUser attempt ${attempt + 1}:`, userData);
              if (userData?.user) break;
              await wait(300);
            }

            if (userData?.user) {
              console.log('AuthCallback: User found via getUser');
              const success = await processOAuthUser(userData.user);
              if (success) return;
              return;
            }
            console.log('AuthCallback: Completely failed, redirecting to login');
            setError('Authentication failed. Please try again.');
            setTimeout(() => redirectToAppRoute('/login'), 2000);
          }
      } catch (err: any) {
        console.error('AuthCallback: Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-page flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-txt mb-2">{error}</p>
            <p className="text-muted text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-brand mx-auto mb-4" />
            <p className="text-txt">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
