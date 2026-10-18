'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth-provider';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Supabase only allows one reset email per address every 60 seconds.
const RESEND_SECONDS = 60;

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {children}
    </p>
  );
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-bold">Password reset is not available</h1>
      <p className="mt-2 text-sm text-muted-foreground">The account service is not set up in this environment.</p>
    </div>
  );
}

/** Step 1: ask for the account email and send the reset link. */
export function ForgotPasswordForm() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = React.useState('');
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const send = async (address: string) => {
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset(address);
      setSentTo(address);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError('Please enter a valid email address.');
      return;
    }
    void send(address);
  };

  if (!isSupabaseConfigured) return <NotConfigured />;

  if (sentTo) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <MailCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If an account exists for <strong>{sentTo}</strong>, we sent a link to reset the password.
          The link works for a limited time, so use it soon. Check your spam folder if you do not see it.
        </p>
        {error && <div className="mt-4"><ErrorLine>{error}</ErrorLine></div>}
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button variant="outline" disabled={busy || cooldown > 0} onClick={() => void send(sentTo)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send again'}
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we will send you a link to choose a new one.
        </p>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            autoComplete="email"
            autoFocus
          />
        </div>
        {error && <ErrorLine>{error}</ErrorLine>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/** Step 2: the page the emailed link opens. Needs the recovery session Supabase creates from the link. */
export function ResetPasswordForm() {
  const { updatePassword } = useAuth();
  const router = useRouter();
  const [state, setState] = React.useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    // Expired or already-used links come back with an error in the address.
    if (/error(_code|_description)?=/.test(window.location.hash + window.location.search)) {
      setState('invalid');
      return;
    }
    // getSession waits for Supabase to read the link's tokens before answering.
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState((s) => (s === 'checking' ? (data.session ? 'ready' : 'invalid') : s));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setState((s) => (s === 'done' ? s : 'ready'));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (state !== 'done') return;
    const t = window.setTimeout(() => router.push('/'), 2000);
    return () => window.clearTimeout(t);
  }, [state, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setState('done');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) return <NotConfigured />;

  if (state === 'checking') {
    return (
      <div className="mx-auto flex max-w-md justify-center px-4 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Checking your link" />
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">This link did not work</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Reset links expire and can only be used once. Request a new one and use it right away.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[hsl(150_60%_38%)]" />
        <h1 className="mt-4 text-2xl font-bold">Password updated</h1>
        <p className="mt-2 text-sm text-muted-foreground">You are signed in. Taking you to the homepage…</p>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/">Go now</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p>
      </div>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && <ErrorLine>{error}</ErrorLine>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}
