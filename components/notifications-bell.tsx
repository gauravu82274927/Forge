'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  MessageCircle,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/components/auth-provider';
import {
  acceptFriendRequest,
  fetchApplicationEvents,
  fetchMyFriendships,
  fetchNotificationsSeenAt,
  fetchUnreadMessages,
  markNotificationsSeen,
  removeFriendship,
} from '@/lib/data';
import { formatDate } from '@/lib/format';
import type { ApplicationEvent, Friendship, Message } from '@/lib/types';

const POLL_MS = 30_000;

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [requests, setRequests] = React.useState<Friendship[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [events, setEvents] = React.useState<ApplicationEvent[]>([]);
  const [seenAt, setSeenAt] = React.useState<string | null>(null);
  // Snapshot of "last seen" taken when the panel opened, so new items stay
  // highlighted while it is open even though we mark everything as seen.
  const [highlightAfter, setHighlightAfter] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const userId = user?.id;

  const load = React.useCallback(async () => {
    if (!userId) return;
    // Each source is independent, so one missing table does not hide the rest.
    const [fr, msg, ev, seen] = await Promise.allSettled([
      fetchMyFriendships(),
      fetchUnreadMessages(userId),
      fetchApplicationEvents(userId),
      fetchNotificationsSeenAt(userId),
    ]);
    if (fr.status === 'fulfilled') {
      setRequests(fr.value.filter((f) => f.status === 'pending' && f.addressee_id === userId));
    }
    if (msg.status === 'fulfilled') setMessages(msg.value);
    if (ev.status === 'fulfilled') setEvents(ev.value);
    if (seen.status === 'fulfilled') setSeenAt(seen.value);
  }, [userId]);

  React.useEffect(() => {
    if (!userId) {
      setRequests([]);
      setMessages([]);
      setEvents([]);
      return;
    }
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [userId, load]);

  const isNewEvent = (e: ApplicationEvent, since: string | null) =>
    !since || e.created_at > since;

  const unreadCount =
    requests.length + messages.length + events.filter((e) => isNewEvent(e, seenAt)).length;

  const onOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && userId) {
      setHighlightAfter(seenAt);
      await load();
      try {
        setSeenAt(await markNotificationsSeen(userId));
      } catch {
        // Not critical: badge for application updates just stays until next time.
      }
    }
  };

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  // One row per sender for unread chats.
  const chats = new Map<string, { name: string; count: number; last: Message }>();
  for (const m of messages) {
    const cur = chats.get(m.sender_id);
    if (cur) cur.count += 1;
    else chats.set(m.sender_id, { name: m.sender?.display_name ?? 'Someone', count: 1, last: m });
  }

  const empty = requests.length === 0 && chats.size === 0 && events.length === 0;
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} new` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {error && (
            <p role="alert" className="m-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {empty && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          )}

          {requests.length > 0 && (
            <section>
              <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Friend requests
              </h3>
              {requests.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-2">
                  <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {f.requester?.display_name ?? 'Someone'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">wants to be your friend</p>
                  </div>
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    disabled={busy === f.id}
                    aria-label="Accept"
                    onClick={() => run(f.id, () => acceptFriendRequest(f.id))}
                  >
                    {busy === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    disabled={busy === f.id}
                    aria-label="Decline"
                    onClick={() => run(f.id, () => removeFriendship(f.id))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </section>
          )}

          {chats.size > 0 && (
            <section>
              <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chats
              </h3>
              {Array.from(chats.entries()).map(([senderId, c]) => (
                <Link
                  key={senderId}
                  href={`/messages?with=${senderId}`}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/60"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.last.body}</p>
                  </div>
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    {c.count}
                  </span>
                </Link>
              ))}
            </section>
          )}

          {events.length > 0 && (
            <section>
              <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Applications
              </h3>
              {events.slice(0, 10).map((e) => {
                const isNew = isNewEvent(e, highlightAfter ?? seenAt);
                const Icon =
                  e.kind === 'accepted' ? CheckCircle2 : e.kind === 'rejected' ? XCircle : FileText;
                const text =
                  e.kind === 'applied'
                    ? `${e.person} applied to`
                    : e.kind === 'accepted'
                      ? 'You were accepted to'
                      : 'Your application was declined for';
                return (
                  <Link
                    key={e.id}
                    href={e.kind === 'applied' ? '/dashboard' : `/teams/${e.postId}`}
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/60"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="text-muted-foreground">{text} </span>
                        <span className="font-medium">{e.postTitle}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
                    </div>
                    {isNew && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="New" />}
                  </Link>
                );
              })}
            </section>
          )}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs">
          <Link href="/messages" onClick={close} className="font-medium hover:underline">
            Open chats
          </Link>
          <Link href="/dashboard" onClick={close} className="font-medium hover:underline">
            Dashboard
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
