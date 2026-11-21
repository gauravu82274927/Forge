import { supabase } from '@/lib/supabase';

export interface MatchResult {
  id: string;
  title: string;
  subtitle: string;
  details: {
    score: number;
    semantic_score: number;
    skills_score: number;
    experience_score: number;
    commitment_score: number;
    method: 'semantic' | 'keyword';
    matched_skills: string[];
    missing_skills: string[];
  };
}

/** Optional enrichment must never cause a successful profile/listing save to fail. */
export async function requestMatchRefresh(kind: 'profile' | 'team', id: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ kind, id }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { /* SQL matching remains available without embeddings. */ }
}

export async function fetchMatches(userId: string, teamId?: string): Promise<MatchResult[]> {
  const { data, error } = teamId
    ? await supabase.rpc('match_users_for_team', { p_team_id: teamId, p_limit: 6 })
    : await supabase.rpc('match_teams_for_user', { p_user_id: userId, p_limit: 6 });
  if (error) throw new Error('Matches are temporarily unavailable. You can still browse teams and profiles.');
  return (data ?? []) as MatchResult[];
}
