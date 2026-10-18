'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { identifyUser, resetAnalytics, track } from '@/lib/analytics';
import type { Profile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ needsVerification: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  const refreshProfile = React.useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setProfile(null);
      return;
    }
    const { data: row } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();
    setProfile((row as unknown as Profile) ?? null);
  }, []);

  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) {
        identifyUser(data.session.user.id);
        void refreshProfile();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        identifyUser(session.user.id);
        void refreshProfile();
      } else {
        setProfile(null);
      }
      if (event === 'SIGNED_OUT') {
        resetAnalytics();
        router.push('/');
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshProfile, router]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyAuthError(error.message));
    track('login');
    router.push('/');
  }, [router]);

  const signUp = React.useCallback(
    async (email: string, password: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          // After the user clicks the link in the verification email,
          // Supabase sends them here and signs them in automatically.
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw new Error(friendlyAuthError(error.message));
      // Supabase returns an obfuscated user with no identities when the email
      // is already registered (to avoid leaking which emails exist).
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Try signing in.');
      }
      // No session means email confirmation is required before sign-in.
      track('sign_up', { needs_verification: !data.session });
      return { needsVerification: !data.session };
    },
    []
  );

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = React.useCallback(async (email: string) => {
    // Supabase answers the same way whether or not the email has an account,
    // so this never reveals which emails are registered.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    track('password_reset_requested');
  }, []);

  const updatePassword = React.useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (m.includes('already registered')) return 'An account with this email already exists. Try signing in.';
  if (m.includes('email not confirmed')) return 'Please verify your email first. Check your inbox for the confirmation link.';
  if (m.includes('rate limit') || m.includes('only request this once') || m.includes('security purposes'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('should be different') || m.includes('same password'))
    return 'Choose a password you have not used before.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'We could not reach the server. Check your connection and try again.';
  return message;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
