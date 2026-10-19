'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';

const DISMISS_KEY = 'forge-profile-banner-dismissed';
const HIDDEN_ON = ['/profile', '/login', '/signup'];

function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** A slim bar under the navbar that nudges new members to finish their profile. */
export function ProfileBanner() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname() ?? '';
  // Start hidden so a dismissed banner never flashes on page load.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (loading || !user || !profile || dismissed) return null;
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const checks = [
    { label: 'college', done: !!profile.college?.trim() },
    { label: 'course', done: !!profile.course?.trim() },
    { label: 'skills', done: (profile.skills ?? []).length > 0 },
  ];
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  if (missing.length === 0) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Dismissing still works for this page view.
    }
  };

  return (
    <div className="border-b border-border bg-accent/25">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div
          className="flex shrink-0 gap-1"
          role="img"
          aria-label={`Profile ${checks.length - missing.length} of ${checks.length} steps done`}
        >
          {checks.map((c) => (
            <span key={c.label} className={`h-1.5 w-6 rounded-full ${c.done ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Finish your profile.</span>{' '}
          <span className="text-muted-foreground">
            Add your {joinWords(missing)} so team owners know who you are.
          </span>
        </p>
        <Button asChild size="sm">
          <Link href="/profile">Complete profile</Link>
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
