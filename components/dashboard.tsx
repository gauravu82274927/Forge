'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Inbox,
  Loader2,
  Plus,
  Send,
  Settings,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CategoryBadge, EmptyState, StatusBadge } from '@/components/forge-badges';
import { useAuth } from '@/components/auth-provider';
import {
  acceptApplication,
  fetchMyApplications,
  fetchMyPosts,
  rejectApplication,
  withdrawApplication,
} from '@/lib/data';
import { formatDeadline, formatDate } from '@/lib/format';
import type { Application, TeamPost } from '@/lib/types';

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [outgoing, setOutgoing] = useState<Application[]>([]);
  const [incoming, setIncoming] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyApp, setBusyApp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState<string | null>(null);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [myPosts, myApps] = await Promise.all([
        fetchMyPosts(userId),
        fetchMyApplications(userId),
      ]);
      setPosts(myPosts);
      setOutgoing(myApps);

      const ownedIds: string[] = myPosts.map((p) => p.id);
      const incomingApps: Application[] = [];
      for (const postId of ownedIds) {
        const { fetchApplicationsForPost } = await import('@/lib/data');
        const apps = await fetchApplicationsForPost(postId);
        incomingApps.push(...apps);
      }
      setIncoming(
        incomingApps.filter((a) => a.applicant_id !== userId).sort(
          (a, b) => b.created_at.localeCompare(a.created_at)
        )
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load(user.id);
    else setLoading(false);
  }, [user, load]);

  const doAccept = async (appId: string) => {
    setBusyApp(appId);
    setError(null);
    try {
      await acceptApplication(appId);
      setIncoming((apps) =>
        apps.map((a) => (a.id === appId ? { ...a, status: 'accepted' } : a))
      );
      if (user) void load(user.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyApp(null);
    }
  };

  const doReject = async (appId: string) => {
    setBusyApp(appId);
    setError(null);
    try {
      await rejectApplication(appId);
      setIncoming((apps) =>
        apps.map((a) => (a.id === appId ? { ...a, status: 'rejected' } : a))
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyApp(null);
    }
  };

  const doWithdraw = async (appId: string) => {
    setConfirmWithdraw(null);
    setBusyApp(appId);
    setError(null);
    try {
      await withdrawApplication(appId);
      setOutgoing((apps) =>
        apps.map((a) => (a.id === appId ? { ...a, status: 'withdrawn' } : a))
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyApp(null);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-10 w-64 animate-pulse rounded bg-secondary" />
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Sign in to see your dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Track your listings, applications, and incoming requests in one place.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><Link href="/login">Sign In</Link></Button>
          <Button variant="outline" asChild><Link href="/signup">Create Account</Link></Button>
        </div>
      </div>
    );
  }

  const pendingIncoming = incoming.filter((a) => a.status === 'pending').length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Your listings and applications at a glance.
          </p>
        </div>
        <Button asChild>
          <Link href="/teams/new">
            <Plus className="mr-2 h-4 w-4" /> New listing
          </Link>
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Tabs defaultValue="listings" className="mt-8">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="listings">
            My listings <Badge variant="secondary" className="ml-1.5">{posts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="incoming">
            Incoming <Badge variant="secondary" className="ml-1.5">{pendingIncoming > 0 ? `${pendingIncoming} new` : incoming.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent <Badge variant="secondary" className="ml-1.5">{outgoing.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* My listings */}
        <TabsContent value="listings" className="mt-6">
          {loading ? (
            <LoadingBlock />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No listings yet"
              description="Publish your first listing and students can start applying to join your project."
              action={
                <Button asChild>
                  <Link href="/teams/new">Post a listing</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={post.category} />
                      <StatusBadge status={post.status} />
                    </div>
                    <Link
                      href={`/teams/${post.id}`}
                      className="mt-1.5 block font-semibold hover:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {post.open_positions} position{post.open_positions === 1 ? '' : 's'} · {post.commitment}
                      {post.deadline ? ` · due ${formatDeadline(post.deadline)}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teams/${post.id}/edit`}>
                        <Settings className="mr-1 h-3.5 w-3.5" /> Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Incoming applications */}
        <TabsContent value="incoming" className="mt-6">
          {loading ? (
            <LoadingBlock />
          ) : incoming.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="No incoming applications"
              description="When students apply to your listings, their intros show up here for review."
            />
          ) : (
            <div className="space-y-3">
              {incoming.map((app) => (
                <div key={app.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {app.applicant?.display_name ?? 'A student'}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          applied to{' '}
                          <Link href={`/teams/${app.team_post_id}`} className="underline-offset-2 hover:underline">
                            {app.team_post?.title ?? 'your listing'}
                          </Link>
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(app.created_at)}
                        {app.applicant?.skills?.length ? ` · ${app.applicant.skills.slice(0, 3).join(', ')}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm leading-relaxed text-foreground/85">
                    {app.intro_message}
                  </p>
                  {app.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyApp === app.id}
                        onClick={() => void doAccept(app.id)}
                      >
                        {busyApp === app.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Accept'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyApp === app.id}
                        onClick={() => void doReject(app.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sent applications */}
        <TabsContent value="sent" className="mt-6">
          {loading ? (
            <LoadingBlock />
          ) : outgoing.length === 0 ? (
            <EmptyState
              icon={<Send className="h-8 w-8" />}
              title="No applications sent"
              description="Find a project that excites you and introduce yourself — teams are waiting."
              action={
                <Button asChild>
                  <Link href="/teams">Discover teams</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {outgoing.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {app.team_post?.category && (
                        <CategoryBadge category={app.team_post.category} />
                      )}
                      <StatusBadge status={app.status} />
                    </div>
                    {app.team_post && (
                      <Link
                        href={`/teams/${app.team_post_id}`}
                        className="mt-1.5 block font-semibold hover:underline"
                      >
                        {app.team_post.title}
                      </Link>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Applied {formatDate(app.created_at)}
                    </p>
                  </div>
                  {app.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyApp === app.id}
                      onClick={() => setConfirmWithdraw(app.id)}
                    >
                      <X className="mr-1 h-3.5 w-3.5" /> Withdraw
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(confirmWithdraw)} onOpenChange={(open) => !open && setConfirmWithdraw(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this application?</AlertDialogTitle>
            <AlertDialogDescription>
              The team will no longer see your application as pending. You can
              apply again later if the listing is still open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep application</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmWithdraw && void doWithdraw(confirmWithdraw)}>
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
      ))}
    </div>
  );
}
