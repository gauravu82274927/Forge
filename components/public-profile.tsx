'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Clock,
  ExternalLink,
  Github,
  GraduationCap,
  Linkedin,
  Loader2,
  MessageCircle,
  Pencil,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/forge-badges';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/components/auth-provider';
import {
  acceptFriendRequest,
  fetchMyFriendships,
  fetchMyPosts,
  fetchProfile,
  sendFriendRequest,
} from '@/lib/data';
import { safeUrl } from '@/lib/format';
import type { Friendship, Profile, TeamPost } from '@/lib/types';

export function PublicProfile({ id }: { id: string }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;
  const isMe = userId === id;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchProfile(id), fetchMyPosts(id).catch(() => [] as TeamPost[])])
      .then(([p, list]) => {
        if (cancelled) return;
        setProfile(p);
        setPosts(list.filter((post) => post.status === 'open'));
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadFriendship = useCallback(async () => {
    if (!userId || userId === id) {
      setFriendship(null);
      return;
    }
    try {
      const rows = await fetchMyFriendships();
      setFriendship(
        rows.find((f) => f.requester_id === id || f.addressee_id === id) ?? null
      );
    } catch {
      setFriendship(null);
    }
  }, [userId, id]);

  useEffect(() => {
    void loadFriendship();
  }, [loadFriendship]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await loadFriendship();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Profile not found"
          description="This member doesn't exist or the link is wrong."
        />
      </div>
    );
  }

  const github = safeUrl(profile.github_url);
  const linkedin = safeUrl(profile.linkedin_url);
  const portfolio = safeUrl(profile.portfolio_url);
  const school = [profile.course, profile.college].filter(Boolean).join(' · ');

  const action = () => {
    if (isMe) {
      return (
        <Button asChild variant="outline">
          <Link href="/profile">
            <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
          </Link>
        </Button>
      );
    }
    if (!user) {
      return (
        <Button asChild>
          <Link href="/login">Sign in to connect</Link>
        </Button>
      );
    }
    if (friendship?.status === 'accepted') {
      return (
        <Button asChild>
          <Link href={`/messages?with=${id}`}>
            <MessageCircle className="mr-1.5 h-4 w-4" /> Message
          </Link>
        </Button>
      );
    }
    if (friendship?.status === 'pending' && friendship.addressee_id === userId) {
      return (
        <Button disabled={busy} onClick={() => run(() => acceptFriendRequest(friendship.id))}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
          Accept request
        </Button>
      );
    }
    if (friendship?.status === 'pending') {
      return (
        <Button variant="outline" disabled>
          <Clock className="mr-1.5 h-4 w-4" /> Request sent
        </Button>
      );
    }
    return (
      <Button disabled={busy} onClick={() => run(() => sendFriendRequest(id))}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
        Add friend
      </Button>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar
            id={profile.id}
            name={profile.display_name}
            src={profile.avatar_url}
            link={false}
            className="h-20 w-20 text-2xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{profile.display_name}</h1>
            {(school || profile.graduation_year) && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {school}
                  {profile.graduation_year ? `${school ? ' · ' : ''}Class of ${profile.graduation_year}` : ''}
                </span>
              </p>
            )}
            <div className="mt-2 flex gap-3">
              {github && (
                <a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-muted-foreground hover:text-foreground">
                  <Github className="h-4 w-4" />
                </a>
              )}
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-foreground">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {portfolio && (
                <a href={portfolio} target="_blank" rel="noopener noreferrer" aria-label="Portfolio" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
          <div className="shrink-0">{action()}</div>
        </div>

        {profile.bio && (
          <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{profile.bio}</p>
        )}

        {profile.skills.length > 0 && (
          <>
            <Separator className="my-6" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </>
        )}

        {profile.preferred_roles.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Looking for roles</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.preferred_roles.map((r) => (
                <Badge key={r} variant="outline">{r}</Badge>
              ))}
            </div>
          </>
        )}

        {profile.interests.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Interests</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.interests.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </div>
          </>
        )}

        {profile.availability && (
          <p className="mt-6 text-xs text-muted-foreground">Available: {profile.availability}</p>
        )}
      </div>

      {posts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Open listings by {profile.display_name}
          </h2>
          <div className="mt-3 space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/teams/${post.id}`}
                className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50"
              >
                <p className="font-semibold">{post.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
