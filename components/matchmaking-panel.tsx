'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { fetchMatches, requestMatchRefresh, type MatchResult } from '@/lib/matchmaking';

export function MatchmakingPanel({ teamId, revision = '' }: { teamId?: string; revision?: string }) {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const userId = user?.id;
  useEffect(() => {
    let active = true;
    if (!userId) { setRows([]); return; }
    setLoading(true);
    setRows([]);
    setError('');
    const load = async () => {
      try {
        const matches = await fetchMatches(userId, teamId);
        if (active) { setRows(matches); setLoading(false); }
        await requestMatchRefresh(teamId ? 'team' : 'profile', teamId ?? userId);
        if (!active) return;
        const enriched = await fetchMatches(userId, teamId);
        if (active) setRows(enriched);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [userId, teamId, profile?.updated_at, refresh, revision]);
  const [invited, setInvited] = useState<string[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState('');

  useEffect(() => {
    setInvited([]);
    setInviteNotice('');
    if (!teamId || !userId) return;
    let active = true;
    void supabase.from('team_invitations').select('recipient_id')
      .eq('team_post_id', teamId).eq('sender_id', userId)
      .then(({ data }) => {
        if (active && data) setInvited(previous => Array.from(new Set([...previous, ...data.map(row => row.recipient_id)])));
      });
    return () => { active = false; };
  }, [teamId, userId]);

  async function invite(recipient: string) {
    if (!teamId || inviteBusy) return;
    setInviteBusy(recipient);
    setInviteNotice('');
    try {
      const { error } = await supabase.rpc('invite_to_team', {
        target_team: teamId, target_recipient: recipient,
      });
      if (error) throw error;
      setInvited(previous => [...previous, recipient]);
      setInviteNotice('Invitation sent.');
    } catch (error) {
      setInviteNotice((error as { message?: string })?.message || 'Could not send the invitation.');
    } finally {
      setInviteBusy(null);
    }
  }

  if (!user) return null;
  return (
    <section aria-label={teamId ? 'Recommended teammates' : 'AI Picks for You'} className="my-8 rounded-2xl border border-primary/20 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{teamId ? 'Recommended teammates' : 'AI Picks for You'}</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">{teamId
            ? 'Find builders who cover skills your team still needs.'
            : 'Find teams where your skills can make a difference.'}</p>
        </div>
        <Button variant="ghost" size="sm" disabled={loading} onClick={() => setRefresh((n) => n + 1)} aria-label="Refresh matches">
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} />
        </Button>
      </div>
      {!teamId && !profile?.skills.length && <p className="mt-3 text-sm text-muted-foreground"><Link href="/profile" className="underline">Add your skills and availability</Link> for more useful matches.</p>}
      <div aria-live="polite" aria-busy={loading} className="mt-5">
        {loading ? <p className="text-sm text-muted-foreground">Finding your matches…</p>
          : error ? <div className="text-sm"><p>{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => setRefresh((n) => n + 1)}>Try again</Button></div>
          : rows.length === 0 ? <p className="text-sm text-muted-foreground">{teamId ? 'No eligible teammates right now. Your listing may be full, closed, or past its deadline.' : 'No new open teams to recommend yet. Check back as new listings appear.'}</p>
          : <div className="grid gap-3 md:grid-cols-2">{rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <Link href={teamId ? `/u/${row.id}` : `/teams/${row.id}`} className="font-semibold hover:underline">{row.title}</Link>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{row.details.score}% fit</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{row.subtitle}</p>
              <p className="mt-3 text-xs font-medium">{row.details.matched_skills.length ? `Fills gaps: ${row.details.matched_skills.join(', ')}` : 'Explore shared interests and working preferences'}</p>
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Why this match?</summary>
                <dl className="mt-2 grid grid-cols-2 gap-1">
                  <dt>{row.details.method === 'semantic' ? 'Semantic similarity' : 'Keyword similarity'} (40%)</dt><dd>{row.details.semantic_score}/100</dd>
                  <dt>Skill-gap coverage (30%)</dt><dd>{row.details.skills_score}/100</dd>
                  <dt>Experience fit (15%)</dt><dd>{row.details.experience_score}/100</dd>
                  <dt>Availability fit (15%)</dt><dd>{row.details.commitment_score}/100</dd>
                </dl>
                {row.details.missing_skills.length > 0 && <p className="mt-2">Still needed: {row.details.missing_skills.join(', ')}</p>}
                <p className="mt-2">{row.details.method === 'keyword' ? 'Using keyword matching while semantic matching is unavailable. ' : ''}Fit is a ranking signal, not a prediction of success. Missing experience or availability receives a neutral score.</p>
              </details>
              {teamId && <Button type="button" size="sm" className="mr-3 mt-3"
                disabled={inviteBusy !== null || invited.includes(row.id)}
                onClick={() => void invite(row.id)}>
                {invited.includes(row.id) ? 'Invited' : inviteBusy === row.id ? 'Sending…' : 'Invite to team'}
              </Button>}
              <Link href={teamId ? `/u/${row.id}` : `/teams/${row.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{teamId ? 'View profile' : 'Explore team'}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
            </article>
          ))}</div>}
      </div>
      {inviteNotice && <p role="status" className="mt-3 text-sm">{inviteNotice}</p>}
    </section>
  );
}
