'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Clock, Loader2, MessageCircle, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/components/auth-provider';
import {
  acceptFriendRequest,
  fetchMyFriendships,
  searchPeople,
  searchProjects,
  sendFriendRequest,
} from '@/lib/data';
import type { Friendship, PersonResult, TeamPost } from '@/lib/types';

type Tab = 'all' | 'people' | 'projects';

export function SearchDialog() {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState<Tab>('all');
  const [people, setPeople] = React.useState<PersonResult[]>([]);
  const [projects, setProjects] = React.useState<TeamPost[]>([]);
  const [friendships, setFriendships] = React.useState<Friendship[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Ctrl/Cmd + K opens the search.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadFriendships = React.useCallback(async () => {
    if (!user) {
      setFriendships([]);
      return;
    }
    try {
      setFriendships(await fetchMyFriendships());
    } catch {
      // Friend buttons simply fall back to "Add friend" if this fails.
    }
  }, [user]);

  React.useEffect(() => {
    if (open) void loadFriendships();
  }, [open, loadFriendships]);

  // Debounced search.
  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setPeople([]);
      setProjects([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const [p, pr] = await Promise.all([
          searchPeople(term, user?.id),
          searchProjects(term),
        ]);
        if (cancelled) return;
        setPeople(p);
        setProjects(pr);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, user?.id]);

  const relationTo = (otherId: string) =>
    friendships.find(
      (f) => f.requester_id === otherId || f.addressee_id === otherId
    );

  const act = async (personId: string, fn: () => Promise<void>) => {
    setBusyId(personId);
    setError(null);
    try {
      await fn();
      await loadFriendships();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const renderFriendButton = (p: PersonResult) => {
    if (!user) {
      return (
        <Button size="sm" variant="outline" asChild>
          <Link href="/login" onClick={() => setOpen(false)}>Sign in to add</Link>
        </Button>
      );
    }
    const rel = relationTo(p.id);
    const busy = busyId === p.id;
    if (rel?.status === 'accepted') {
      return (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/messages?with=${p.id}`} onClick={() => setOpen(false)}>
            <MessageCircle className="mr-1 h-4 w-4" /> Message
          </Link>
        </Button>
      );
    }
    if (rel && rel.requester_id === user.id) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Request sent
        </span>
      );
    }
    if (rel) {
      return (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => act(p.id, () => acceptFriendRequest(rel.id))}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
          Accept
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => act(p.id, () => sendFriendRequest(p.id))}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
        Add friend
      </Button>
    );
  };

  const showPeople = tab !== 'projects';
  const showProjects = tab !== 'people';
  const searched = query.trim().length >= 2;
  const nothing =
    searched &&
    !loading &&
    (!showPeople || people.length === 0) &&
    (!showProjects || projects.length === 0);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Search people and projects"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] font-medium sm:inline">
          Ctrl K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[10%] max-w-xl translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search for people to add as friends and projects to apply to.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, projects, skills, colleges…"
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          </div>

          <div className="flex gap-1 border-b px-3 py-2 text-sm">
            {(['all', 'people', 'projects'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1 capitalize transition-colors ${
                  tab === t
                    ? 'bg-secondary font-semibold text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!searched && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Type at least 2 characters. Try a name, a project title, a skill like
                &ldquo;Python&rdquo;, or your college.
              </p>
            )}

            {error && (
              <p role="alert" className="m-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {nothing && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query.trim()}&rdquo;.
              </p>
            )}

            {searched && showPeople && people.length > 0 && (
              <section className="mb-2">
                <h3 className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  People
                </h3>
                {people.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.course, p.college].filter(Boolean).join(' · ') || 'Forge member'}
                      </p>
                      {p.skills?.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p.skills.slice(0, 4).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">{renderFriendButton(p)}</div>
                  </div>
                ))}
              </section>
            )}

            {searched && showProjects && projects.length > 0 && (
              <section>
                <h3 className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Projects
                </h3>
                {projects.map((post) => (
                  <Link
                    key={post.id}
                    href={`/teams/${post.id}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 hover:bg-secondary/60"
                  >
                    <p className="truncate text-sm font-semibold">{post.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {post.category}
                      {post.owner?.display_name ? ` · by ${post.owner.display_name}` : ''}
                    </p>
                    {post.required_skills?.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {post.required_skills.slice(0, 4).join(', ')}
                      </p>
                    )}
                  </Link>
                ))}
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
