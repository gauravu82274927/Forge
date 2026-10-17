'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth-provider';
import { isSupabaseConfigured } from '@/lib/supabase';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup' && displayName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, displayName.trim());
        setSuccess('Account created! You are signed in.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Authentication is not configured yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Forge connects to a backend for accounts. The connection is not set up
          in this environment, so sign-in is temporarily unavailable. Browsing
          teams still works — try the Discover Teams page.
        </p>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/teams">Discover Teams</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === 'login'
            ? 'Sign in to apply to teams and manage your listings.'
            : 'Join Forge to apply to teams, post listings, and build your profile.'}
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {mode === 'signup' && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Maya Chen"
              autoComplete="name"
              maxLength={60}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-[hsl(150_60%_40%_/_0.3)] bg-[hsl(150_60%_45%_/_0.08)] p-3 text-sm text-[hsl(150_55%_28%)]">
            {success}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait…</>
          ) : mode === 'login' ? (
            <><LogIn className="mr-2 h-4 w-4" /> Sign In</>
          ) : (
            <><UserPlus className="mr-2 h-4 w-4" /> Create Account</>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>New to Forge? <Link href="/signup" className="font-semibold text-foreground underline-offset-4 hover:underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
