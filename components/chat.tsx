'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/forge-badges';
import { useAuth } from '@/components/auth-provider';
import { UserAvatar } from '@/components/user-avatar';
import {
  fetchConversation,
  fetchLatestMessages,
  fetchMyFriendships,
  markConversationRead,
  sendMessage,
} from '@/lib/data';
import type { Friendship, Message } from '@/lib/types';

const POLL_MS = 4000;

interface Friend {
  id: string;
  name: string;
  detail: string;
  avatar: string | null;
}

export function Chat() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get('with');

  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [latest, setLatest] = React.useState<Map<string, Message>>(new Map());
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const userId = user?.id;

  const loadList = React.useCallback(async () => {
    if (!userId) return;
    try {
      const rows: Friendship[] = await fetchMyFriendships();
      setFriends(
        rows
          .filter((f) => f.status === 'accepted')
          .map((f) => {
            const p = f.requester_id === userId ? f.addressee : f.requester;
            return {
              id: f.requester_id === userId ? f.addressee_id : f.requester_id,
              name: p?.display_name ?? 'Forge member',
              detail: [p?.course, p?.college].filter(Boolean).join(' · '),
              avatar: p?.avatar_url ?? null,
            };
          })
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
    try {
      setLatest(await fetchLatestMessages(userId));
    } catch {
      // The list still works without previews.
    }
    setLoading(false);
  }, [userId]);

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadThread = React.useCallback(async () => {
    if (!userId || !selectedId) return;
    try {
      const data = await fetchConversation(selectedId, userId);
      setMessages(data);
      if (data.some((m) => m.recipient_id === userId && !m.read_at)) {
        await markConversationRead(selectedId);
        void loadList();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [userId, selectedId, loadList]);

  React.useEffect(() => {
    setMessages([]);
    if (!selectedId) return;
    void loadThread();
    const timer = setInterval(() => void loadThread(), POLL_MS);
    return () => clearInterval(timer);
  }, [selectedId, loadThread]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(selectedId, draft);
      setDraft('');
      await loadThread();
      void loadList();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (authLoading || (user && loading)) {
    return <div className="mx-auto mt-10 h-96 max-w-5xl animate-pulse rounded-xl bg-secondary" />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Sign in to chat</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Messages are available once you&apos;re signed in and have friends on Forge.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  const selected = friends.find((f) => f.id === selectedId);
  const sorted = [...friends].sort((a, b) =>
    (latest.get(b.id)?.created_at ?? '').localeCompare(latest.get(a.id)?.created_at ?? '')
  );

  return (
    <div className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-8">
      <h1 className={`text-3xl font-extrabold tracking-tight ${selected ? 'hidden md:block' : ''}`}>Messages</h1>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {friends.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<MessageCircle className="h-8 w-8" />}
            title="No one to chat with yet"
            description="You can message people once they accept your friend request. Use Search to find people."
          />
        </div>
      ) : (
        <div className={`grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card md:mt-6 md:grid-cols-[17rem_minmax(0,1fr)] ${selected ? 'mt-0' : 'mt-6'}`}>
          {/* Friend list */}
          <ul className={`max-h-[calc(100dvh-14rem)] divide-y overflow-y-auto md:max-h-[70vh] border-border md:border-r ${selected ? 'hidden md:block' : ''}`}>
            {sorted.map((f) => {
              const last = latest.get(f.id);
              const unread = last && last.recipient_id === user.id && !last.read_at;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/messages?with=${f.id}`)}
                    className={`w-full px-4 py-3 text-left hover:bg-secondary/60 ${f.id === selectedId ? 'bg-secondary' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar id={f.id} name={f.name} src={f.avatar} link={false} className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-sm ${unread ? 'font-bold' : 'font-semibold'}`}>{f.name}</p>
                          {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                        </div>
                        <p className={`truncate text-xs ${unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {last ? `${last.sender_id === user.id ? 'You: ' : ''}${last.body}` : f.detail || 'Say hi'}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Thread */}
          <div className={`flex h-[calc(100dvh-6.5rem)] min-h-[20rem] min-w-0 flex-col md:h-[70vh] ${selected ? '' : 'hidden md:flex'}`}>
            {selected ? (
              <>
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Back" onClick={() => router.push('/messages')}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <UserAvatar id={selected.id} name={selected.name} src={selected.avatar} className="h-10 w-10" />
                  <Link href={`/u/${selected.id}`} className="min-w-0 hover:underline">
                    <p className="truncate text-sm font-semibold">{selected.name}</p>
                    {selected.detail && <p className="truncate text-xs text-muted-foreground">{selected.detail}</p>}
                  </Link>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                  {messages.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No messages yet. Say hello to {selected.name}.
                    </p>
                  )}
                  {messages.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'items-end justify-start gap-2'}`}>
                        {!mine && (
                          <UserAvatar id={selected.id} name={selected.name} src={selected.avatar} className="h-7 w-7 text-[10px]" />
                        )}
                        <div
                          className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                            mine ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                          }`}
                        >
                          {m.body}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
                  <Input
                    className="min-w-0 text-base md:text-sm"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message…"
                    maxLength={2000}
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={sending || !draft.trim()} aria-label="Send">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a friend to start chatting.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
