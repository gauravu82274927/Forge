'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { fetchUnreadMessages } from '@/lib/data';
import { cn } from '@/lib/utils';

/**
 * The Messages tab. "tab" is the text link in the main nav (desktop);
 * "icon" is a compact button for small screens, where the main nav is hidden.
 */
export function MessagesLink({ variant }: { variant: 'tab' | 'icon' }) {
  const { user } = useAuth();
  const pathname = usePathname() ?? '';
  const [unread, setUnread] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await fetchUnreadMessages(userId);
        if (!cancelled) setUnread(rows.length);
      } catch {
        // The tab still works without the count.
      }
    };
    void load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [userId, pathname]);

  if (!userId) return null;

  const active = pathname.startsWith('/messages');
  const label = unread > 9 ? '9+' : String(unread);

  if (variant === 'icon') {
    return (
      <Link
        href="/messages"
        aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
        className={cn(
          'relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-secondary md:hidden',
          active && 'bg-secondary'
        )}
      >
        <MessageCircle className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {label}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/messages"
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-foreground',
        active ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      Messages
      {unread > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
          {label}
        </span>
      )}
    </Link>
  );
}
