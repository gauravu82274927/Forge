'use client';

import { useEffect, useState } from 'react';
import { Heatmap } from '@/components/heatmap';
import { parseGithubUsername, parseLeetcodeUsername, type HeatmapData } from '@/lib/heatmap';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: HeatmapData };

interface Source {
  platform: string;
  endpoint: string;
  username: string;
  profileUrl: string;
  headline: string;
  unit: string;
}

function useHeatmap(source: Source | null): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  const endpoint = source?.endpoint;
  const username = source?.username;
  const platform = source?.platform;

  useEffect(() => {
    if (!endpoint || !username) return;
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(`${endpoint}?user=${encodeURIComponent(username)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && json && json.ok) {
          setState({ status: 'ok', data: json as HeatmapData });
        } else if (res.status === 404) {
          setState({ status: 'error', message: `No ${platform} profile found for “${username}”.` });
        } else {
          setState({ status: 'error', message: `Couldn’t load ${platform} activity right now.` });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', message: `Couldn’t load ${platform} activity right now.` });
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, username, platform]);

  return state;
}

function HeatmapBlock({ source }: { source: Source }) {
  const state = useHeatmap(source);

  if (state.status === 'loading') {
    return <div className="h-44 animate-pulse rounded-xl bg-secondary" />;
  }
  if (state.status === 'error') {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {state.message}
      </p>
    );
  }
  const d = state.data;
  return (
    <Heatmap
      platform={source.platform}
      username={source.username}
      profileUrl={source.profileUrl}
      headline={source.headline}
      unit={source.unit}
      total={d.total}
      days={d.days}
      activeDays={d.activeDays}
      maxStreak={d.maxStreak}
      exact={d.exact}
    />
  );
}

export function ProfileHeatmaps({
  githubUrl,
  leetcodeUrl,
}: {
  githubUrl: string | null;
  leetcodeUrl: string | null;
}) {
  const gh = parseGithubUsername(githubUrl);
  const lc = parseLeetcodeUsername(leetcodeUrl);
  if (!gh && !lc) return null;

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Coding activity</h2>
      {gh && (
        <HeatmapBlock
          source={{
            platform: 'GitHub',
            endpoint: '/api/heatmap/github',
            username: gh,
            profileUrl: `https://github.com/${gh}`,
            headline: 'contributions in the last year',
            unit: 'contributions',
          }}
        />
      )}
      {lc && (
        <HeatmapBlock
          source={{
            platform: 'LeetCode',
            endpoint: '/api/heatmap/leetcode',
            username: lc,
            profileUrl: `https://leetcode.com/u/${lc}`,
            headline: 'submissions in the past one year',
            unit: 'submissions',
          }}
        />
      )}
    </section>
  );
}
