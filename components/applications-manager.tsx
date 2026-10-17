'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, CategoryBadge } from '@/components/forge-badges';
import { useAuth } from '@/components/auth-provider';
import {
  acceptApplication,
  fetchAcceptedCount,
  fetchApplicationsForPost,
  fetchTeamPost,
  rejectApplication,
} from '@/lib/data';
import { formatDate } from '@/lib/format';
import type { Application, TeamPost } from '@/lib/types';

export function ApplicationsManager() {
  const params = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState<TeamPost | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [accepted, setAccepted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([
        fetchTeamPost(params.id),
        fetchApplicationsForPost(params.id),
      ]);
      setPost(p);
      setApps(a);
      setAccepted(await fetchAcceptedCount(params.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [user, load]);

  const doAccept = async (appId: string) => {
    setBusy(appId);
    setError(null);
    try {
      await acceptApplication(appId);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const doReject = async (appId: string) => {
    setBusy(appId);
    setError(null);
    try {
      await rejectApplication(appId);
      setApps((list) =>
        list.map((a) => (a.id === appId ? { ...a, status: 'rejected' } : a))
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="h-10 w-72 animate-pulse rounded bg-secondary" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <Button className="mt-6" asChild><Link href="/login">Sign In</Link></Button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Listing not found</h1>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (post.owner_id !== user.id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Only the owner can manage applications</h1>
        <Button className="mt-6" variant="outline" asChild>
          <Link href={`/teams/${post.id}`}>Back to listing</Link>
        </Button>
      </div>
    );
  }

  const spotsLeft = post.open_positions - accepted;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CategoryBadge category={post.category} />
            <StatusBadge status={post.status} />
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            Applications for {post.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {spotsLeft} of {post.open_positions} position{post.open_positions === 1 ? '' : 's'} still open
            {spotsLeft === 0 && ' — accepting more requires free positions'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/teams/${post.id}/edit`}>Edit listing</Link>
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {apps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <h2 className="font-semibold">No applications yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share your listing with classmates — applications will land here.
            </p>
          </div>
        ) : (
          apps.map((app) => (
            <div key={app.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{app.applicant?.display_name ?? 'Applicant'}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[app.applicant?.course, app.applicant?.college].filter(Boolean).join(' · ')}
                    {app.applicant?.college ? ' · ' : ''}Applied {formatDate(app.created_at)}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </div>

              {app.applicant?.skills?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {app.applicant.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm leading-relaxed text-foreground/85">
                {app.intro_message}
              </p>

              {app.status === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy === app.id || spotsLeft <= 0}
                    onClick={() => void doAccept(app.id)}
                  >
                    {busy === app.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <><Check className="mr-1 h-3.5 w-3.5" /> Accept</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === app.id}
                    onClick={() => void doReject(app.id)}
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Decline
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
