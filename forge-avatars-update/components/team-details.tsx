'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  FileText,
  Flag,
  Github,
  GraduationCap,
  Layers,
  MapPin,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CategoryBadge, StatusBadge } from '@/components/forge-badges';
import { useAuth } from '@/components/auth-provider';
import { UserAvatar } from '@/components/user-avatar';
import { safeUrl } from '@/lib/format';
import {
  acceptApplication,
  createReport,
  fetchAcceptedCount,
  fetchMyApplicationForPost,
  fetchTeamPost,
  rejectApplication,
  submitApplication,
  updateTeamPost,
  withdrawApplication,
} from '@/lib/data';
import {
  collaborationLabel,
  experienceLabel,
  formatDeadline,
  formatDate,
} from '@/lib/format';
import type { Application, TeamPost } from '@/lib/types';

export function TeamDetails() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [post, setPost] = useState<TeamPost | null>(null);
  const [accepted, setAccepted] = useState(0);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [intro, setIntro] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or fake listing');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTeamPost(params.id)
      .then(async (data) => {
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setPost(data);
        const count = await fetchAcceptedCount(params.id);
        if (!cancelled) setAccepted(count);
        if (user) {
          const app = await fetchMyApplicationForPost(params.id, user.id);
          if (!cancelled) setMyApplication(app);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, user]);

  const isOwner = Boolean(user && post && user.id === post.owner_id);
  const spotsLeft = post ? Math.max(0, post.open_positions - accepted) : 0;

  const submit = async () => {
    if (!post || !user) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await submitApplication(post.id, intro.trim());
      setApplyOpen(false);
      setIntro('');
      const app = await fetchMyApplicationForPost(post.id, user.id);
      setMyApplication(app);
    } catch (e) {
      const msg = (e as Error).message;
      setActionError(
        msg.includes('duplicate key')
          ? 'You have already applied to this team.'
          : msg.includes('row-level security')
            ? "You can't apply to this listing. It may be yours, closed, or past its deadline."
            : msg
      );
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async () => {
    if (!myApplication) return;
    setBusy(true);
    try {
      await withdrawApplication(myApplication.id);
      setMyApplication({ ...myApplication, status: 'withdrawn' });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendReport = async () => {
    if (!post) return;
    setReportBusy(true);
    try {
      await createReport({
        team_post_id: post.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
      setReportDone(true);
      setReportDetails('');
    } catch (e) {
      setActionError((e as Error).message);
      setReportOpen(false);
    } finally {
      setReportBusy(false);
    }
  };

  const toggleStatus = async () => {
    if (!post) return;
    setBusy(true);
    setActionError(null);
    try {
      const next = post.status === 'open' ? 'closed' : 'open';
      await updateTeamPost(post.id, { status: next });
      setPost({ ...post, status: next });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
        <div className="h-8 w-32 animate-pulse rounded bg-secondary" />
        <div className="h-40 animate-pulse rounded-xl bg-secondary" />
        <div className="h-64 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Listing not found</h1>
        <p className="mt-2 text-muted-foreground">
          This listing may have been removed or never existed.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/teams">Back to Discover Teams</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All listings
      </Link>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={post.category} />
            <StatusBadge status={post.status} />
            {post.is_demo && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                Demo listing
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            {post.title}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{post.summary}</p>
        </div>
        <div className="flex flex-col items-stretch gap-2">
          {isOwner ? (
            <>
              <Button asChild>
                <Link href={`/teams/${post.id}/edit`}>
                  <Settings className="mr-2 h-4 w-4" /> Edit Listing
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/teams/${post.id}/applications`}>
                  <FileText className="mr-2 h-4 w-4" /> Manage Applications
                </Link>
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => void toggleStatus()}>
                {post.status === 'open' ? 'Close Listing' : 'Reopen Listing'}
              </Button>
            </>
          ) : post.status === 'closed' ? (
            <Badge variant="secondary" className="justify-center py-2">
              This listing is closed
            </Badge>
          ) : myApplication ? (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <StatusBadge status={myApplication.status} />
              <p className="mt-2 text-xs text-muted-foreground">
                Applied {formatDate(myApplication.created_at)}
              </p>
              {myApplication.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  disabled={busy}
                  onClick={() => void withdraw()}
                >
                  Withdraw application
                </Button>
              )}
            </div>
          ) : user ? (
            <Button size="lg" onClick={() => setApplyOpen(true)}>
              Apply to Join
            </Button>
          ) : (
            <Button size="lg" asChild>
              <Link href="/login">Sign in to apply</Link>
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {/* Meta grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Users, label: 'Open roles', value: post.open_roles.join(', ') || 'Flexible' },
          { icon: Layers, label: 'Positions', value: `${spotsLeft} of ${post.open_positions} left` },
          { icon: Clock, label: 'Commitment', value: post.commitment },
          { icon: MapPin, label: 'Format', value: collaborationLabel(post.collaboration_format) },
          { icon: GraduationCap, label: 'Experience', value: experienceLabel(post.experience_level) },
          { icon: CalendarClock, label: 'Deadline', value: formatDeadline(post.deadline) },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card p-4">
            <m.icon className="h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-xs font-medium text-muted-foreground">{m.label}</p>
            <p className="mt-0.5 text-sm font-semibold leading-snug">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold">About this project</h2>
          <div className="mt-3 space-y-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
            {post.description}
          </div>

          {post.required_skills.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-semibold">Skills needed</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.required_skills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Posted by
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <UserAvatar
              id={post.owner?.id}
              name={post.owner?.display_name}
              src={post.owner?.avatar_url}
              className="h-12 w-12 text-sm"
            />
            <p className="text-lg font-semibold">
              {post.owner?.display_name ?? 'A student builder'}
            </p>
          </div>
          {post.owner?.college && (
            <p className="mt-1 text-sm text-muted-foreground">{post.owner.college}</p>
          )}
          {post.owner?.course && (
            <p className="text-sm text-muted-foreground">{post.owner.course}</p>
          )}
          {post.application_instructions && (
            <>
              <Separator className="my-4" />
              <p className="text-sm font-medium">What owners look for</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {post.application_instructions}
              </p>
            </>
          )}
          {safeUrl(post.owner?.github_url) && (
            <a
              href={safeUrl(post.owner?.github_url) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Github className="h-4 w-4" /> GitHub profile
            </a>
          )}
        </aside>
      </div>

      {user && !isOwner && (
        <div className="mt-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setReportDone(false);
              setReportOpen(true);
            }}
          >
            <Flag className="mr-2 h-4 w-4" /> Report this listing
          </Button>
        </div>
      )}

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to join {post.title}</DialogTitle>
            <DialogDescription>
              Introduce yourself in a few sentences — your skills, what draws
              you to this project, and how much time you can give.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="intro">Your intro</Label>
            <Textarea
              id="intro"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              rows={5}
              placeholder="Hi! I'm…"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{intro.length}/1000</p>
          </div>
          {actionError && (
            <p className="text-sm text-destructive">{actionError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={submitting || intro.trim().length < 20}>
              {submitting ? 'Sending…' : 'Send application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
            <DialogDescription>
              Tell us what is wrong. A person will review it.
            </DialogDescription>
          </DialogHeader>
          {reportDone ? (
            <p className="text-sm">Thanks. Your report was sent.</p>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="report-reason">Reason</Label>
                <select
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>Spam or fake listing</option>
                  <option>Inappropriate content</option>
                  <option>Harassment</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="report-details">Details (optional)</Label>
                <Textarea
                  id="report-details"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              {reportDone ? 'Close' : 'Cancel'}
            </Button>
            {!reportDone && (
              <Button onClick={() => void sendReport()} disabled={reportBusy}>
                {reportBusy ? 'Sending…' : 'Send report'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
