'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle2, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { SUGGESTIONS } from '@/lib/assistant-knowledge';

// three.js is only downloaded when the browser is idle, not on first paint.
const AssistantOrb = dynamic(() => import('@/components/assistant-orb'), { ssr: false });

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: Msg = {
  role: 'assistant',
  content:
    'Hi, I am the Forge assistant. Ask me anything about finding teams, applying, posting listings, friends or chat. If something is wrong, use the Complaint tab.',
};

const CATEGORIES = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'abuse', label: 'Abuse or harassment' },
  { value: 'listing', label: 'Problem with a listing' },
  { value: 'account', label: 'Account or privacy' },
  { value: 'other', label: 'Something else' },
] as const;

/** Flat version of the character, shown while the 3D one loads or if WebGL is unavailable. */
function FlatBot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="14" r="4" fill="hsl(22 92% 56%)" />
      <rect x="30.5" y="14" width="3" height="8" fill="hsl(76 85% 52%)" />
      <rect x="10" y="22" width="44" height="34" rx="16" fill="hsl(76 85% 52%)" />
      <rect x="16" y="30" width="32" height="18" rx="9" fill="hsl(24 12% 8%)" />
      <rect x="23" y="35" width="5" height="8" rx="2.5" fill="hsl(76 100% 70%)" />
      <rect x="36" y="35" width="5" height="8" rx="2.5" fill="hsl(76 100% 70%)" />
    </svg>
  );
}

function Launcher({ thinking }: { thinking: boolean }) {
  const [ready, setReady] = React.useState(false);
  const [flat, setFlat] = React.useState(false);

  React.useEffect(() => {
    // Wait for an idle moment so the 3D library does not compete with first paint.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true));
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <span className="relative block h-full w-full">
      <span className="absolute inset-3 rounded-full bg-accent/25 blur-xl" aria-hidden="true" />
      {ready && !flat ? (
        <AssistantOrb thinking={thinking} className="relative h-full w-full" onUnsupported={() => setFlat(true)} />
      ) : (
        <FlatBot className="relative h-full w-full p-2" />
      )}
    </span>
  );
}

export function ForgeAssistant() {
  const { user, profile } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<'ask' | 'complaint'>('ask');
  const [messages, setMessages] = React.useState<Msg[]>([GREETING]);
  const [input, setInput] = React.useState('');
  const [thinking, setThinking] = React.useState(false);
  const [hint, setHint] = React.useState(false);

  // Complaint form
  const [category, setCategory] = React.useState<string>('bug');
  const [details, setDetails] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [filing, setFiling] = React.useState(false);
  const [filed, setFiled] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // One-time greeting bubble per browser session.
  React.useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('forge-assistant-hint') === '1';
    } catch {
      // storage blocked: just show it
    }
    if (seen) return;
    const show = window.setTimeout(() => setHint(true), 2500);
    const hide = window.setTimeout(() => setHint(false), 9000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  const openPanel = () => {
    setOpen(true);
    setHint(false);
    track('assistant_opened');
    try {
      sessionStorage.setItem('forge-assistant-hint', '1');
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  React.useEffect(() => {
    if (open && tab === 'ask') inputRef.current?.focus();
  }, [open, tab]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, thinking, open, tab]);

  const ask = async (text: string) => {
    const q = text.trim().slice(0, 1000);
    if (!q || thinking) return;
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setThinking(true);
    let reply = 'Sorry, I could not answer that right now. Please try again, or use the Complaint tab.';
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-10) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; mode?: string };
      if (typeof data.reply === 'string' && data.reply) reply = data.reply;
      // Never include the question text.
      track('assistant_question', { mode: data.mode ?? 'unknown' });
    } catch {
      // keep the default reply
    }
    setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    setThinking(false);
  };

  const fileComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const text = details.trim();
    if (text.length < 10) {
      setFormError('Please describe the problem in at least 10 characters.');
      return;
    }
    const mail = email.trim();
    if (!user && mail && !/^\S+@\S+\.\S+$/.test(mail)) {
      setFormError('That email address does not look right. Leave it empty if you prefer.');
      return;
    }
    setFiling(true);
    const { error } = await supabase.from('complaints').insert({
      category,
      details: text,
      contact_email: user ? null : mail || null,
      page_url: window.location.pathname,
    });
    setFiling(false);
    if (error) {
      const m = error.message.toLowerCase();
      setFormError(
        m.includes('failed to fetch') || m.includes('network')
          ? 'We could not reach the server. Check your connection and try again.'
          : m.includes('schema cache') || m.includes('does not exist')
            ? 'Complaints are not set up yet. Please try again later.'
            : `We could not send your complaint: ${error.message}`
      );
      return;
    }
    track('complaint_filed', { category });
    setFiled(true);
    setDetails('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          role="dialog"
          aria-label="Forge assistant"
          className="flex h-[32rem] max-h-[calc(100vh-8rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl sm:w-96"
        >
          <header className="flex items-center gap-3 border-b border-border bg-secondary/50 px-4 py-3">
            <FlatBot className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold leading-tight">Forge assistant</h2>
              <p className="text-xs text-muted-foreground">Questions, help, complaints</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close assistant" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex gap-1 border-b border-border px-3 py-2 text-sm" role="tablist">
            {(['ask', 'complaint'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  tab === t ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'ask' ? 'Ask' : 'Raise a complaint'}
              </button>
            ))}
          </div>

          {tab === 'ask' ? (
            <>
              <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                        m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl bg-secondary px-3.5 py-3" aria-label="Assistant is typing">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {messages.length === 1 && !thinking && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void ask(s)}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-accent hover:bg-accent/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(input);
                }}
                className="flex gap-2 border-t border-border p-3"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question…"
                  maxLength={1000}
                  autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={thinking || !input.trim()} aria-label="Send">
                  {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          ) : filed ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-[hsl(150_60%_38%)]" />
              <h3 className="font-semibold">Thanks, we got it</h3>
              <p className="text-sm text-muted-foreground">
                Your complaint was sent to the Forge team. We will look into it.
              </p>
              <Button variant="outline" size="sm" onClick={() => setFiled(false)}>
                File another
              </Button>
            </div>
          ) : (
            <form onSubmit={fileComplaint} className="flex min-h-0 flex-1 flex-col" noValidate>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="complaint-category">What is it about?</Label>
                  <select
                    id="complaint-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="complaint-details">Tell us what happened</Label>
                  <Textarea
                    id="complaint-details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Include names, the page you were on and what you expected."
                    rows={4}
                    maxLength={2000}
                  />
                </div>
                {user ? (
                  <p className="text-xs text-muted-foreground">
                    Filing as {profile?.display_name ?? 'your account'}, so we can follow up with you.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="complaint-email">Email (optional)</Label>
                    <Input
                      id="complaint-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="So we can reply to you"
                      autoComplete="email"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2 border-t border-border p-3">
                {formError && (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                    {formError}
                  </p>
                )}
                <Button type="submit" disabled={filing} className="w-full">
                  {filing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send complaint
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      <div className="relative">
        {hint && !open && (
          <div className="absolute bottom-10 right-full mr-1 w-max max-w-[12rem] rounded-2xl rounded-br-sm border border-border bg-card px-3 py-2 text-xs font-medium shadow-lg">
            Hi! Need a hand with Forge?
          </div>
        )}
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openPanel())}
          aria-label={open ? 'Close Forge assistant' : 'Open Forge assistant'}
          aria-expanded={open}
          className="block h-24 w-24 rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Launcher thinking={thinking} />
        </button>
      </div>
    </div>
  );
}
