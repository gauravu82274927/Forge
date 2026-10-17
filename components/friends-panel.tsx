'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, MessageCircle, UserMinus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/forge-badges';
import { useAuth } from '@/components/auth-provider';
import { acceptFriendRequest, fetchMyFriendships, removeFriendship } from '@/lib/data';
import type { Friendship } from '@/lib/types';

type Person = NonNullable<Friendship['requester']>;

export function FriendsPanel({ onPendingChange }: { onPendingChange?: (n: number) => void }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyFriendships();
      setRows(data);
      setError(null);
      if (user) {
        onPendingChange?.(
          data.filter((f) => f.status === 'pending' && f.addressee_id === user.id).length
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, onPendingChange]);

  useEffect(() => {
    void load();
  }, [load]);

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
  if (loading) {
    return <div className="h-24 animate-pulse rounded-xl bg-secondary" />;
  }

  const other = (f: Friendship): Person | undefined =>
    f.requester_id === user.id ? f.addressee : f.requester;

  const incoming = rows.filter((f) => f.status === 'pending' && f.addressee_id === user.id);
  const sent = rows.filter((f) => f.status === 'pending' && f.requester_id === user.id);
  const friends = rows.filter((f) => f.status === 'accepted');

  const PersonLine = ({ f }: { f: Friendship }) => {
    const p = other(f);
    return (
      <div className="min-w-0">
        <p className="truncate font-semibold">{p?.display_name ?? 'Forge member'}</p>
        <p className="truncate text-sm text-muted-foreground">
          {[p?.course, p?.college].filter(Boolean).join(' · ') || ' '}
        </p>
      </div>
    );
  };

  const Spinner = ({ id }: { id: string }) =>
    busy === id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null;

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {incoming.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Friend requests
          </h3>
          <div className="space-y-3">
            {incoming.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <PersonLine f={f} />
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" disabled={busy === f.id} onClick={() => run(f.id, () => acceptFriendRequest(f.id))}>
                    <Spinner id={f.id} /> <Check className="mr-1 h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === f.id} onClick={() => run(f.id, () => removeFriendship(f.id))}>
                    <X className="mr-1 h-4 w-4" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No friends yet"
            description="Use Search at the top of the page to find people and send a friend request."
          />
        ) : (
          <div className="space-y-3">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <PersonLine f={f} />
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/messages?with=${other(f)?.id ?? ''}`}>
                      <MessageCircle className="mr-1 h-4 w-4" /> Message
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === f.id} onClick={() => run(f.id, () => removeFriendship(f.id))}>
                    <Spinner id={f.id} /> <UserMinus className="mr-1 h-4 w-4" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {sent.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Requests you sent
          </h3>
          <div className="space-y-3">
            {sent.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <PersonLine f={f} />
                <Button size="sm" variant="outline" disabled={busy === f.id} onClick={() => run(f.id, () => removeFriendship(f.id))}>
                  <Spinner id={f.id} /> Cancel
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
