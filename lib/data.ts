import { supabase } from '@/lib/supabase';
import type {
  Application,
  ApplicationStatus,
  Profile,
  TeamPost,
} from '@/lib/types';

export interface TeamPostQuery {
  search?: string;
  category?: string;
  experience?: string;
  commitment?: string;
  status?: 'open' | 'closed' | 'all';
  sort?: 'newest' | 'deadline' | 'positions';
}

const POST_SELECT = `*,
  owner:profiles!team_posts_owner_id_fkey(id, display_name, college, course, github_url)`;

export async function fetchTeamPosts(query: TeamPostQuery = {}): Promise<TeamPost[]> {
  let req = supabase
    .from('team_posts')
    .select(POST_SELECT);

  req = req.eq('status', query.status ?? 'open');

  if (query.category) req = req.eq('category', query.category);
  if (query.experience) req = req.eq('experience_level', query.experience);
  if (query.commitment) req = req.eq('commitment', query.commitment);
  if (query.search?.trim()) {
    const term = query.search.trim().replace(/[%,()]/g, ' ');
    req = req.or(
      `title.ilike.%${term}%,summary.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`
    );
  }

  if (query.sort === 'deadline') {
    req = req.order('deadline', { ascending: true, nullsFirst: false });
  } else if (query.sort === 'positions') {
    req = req.order('open_positions', { ascending: false });
  } else {
    req = req.order('created_at', { ascending: false });
  }

  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return attachCounts((data ?? []) as unknown as TeamPost[]);
}

export async function fetchTeamPost(id: string): Promise<TeamPost | null> {
  const { data, error } = await supabase
    .from('team_posts')
    .select(POST_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as TeamPost) ?? null;
}

export async function fetchAcceptedCount(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc('team_post_accepted_counts');
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { team_post_id: string; accepted_count: number }[];
  return rows.find((r) => r.team_post_id === postId)?.accepted_count ?? 0;
}

async function attachCounts(posts: TeamPost[]): Promise<TeamPost[]> {
  if (posts.length === 0) return posts;
  const { data, error } = await supabase.rpc('team_post_accepted_counts');
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { team_post_id: string; accepted_count: number }[];
  const counts = new Map(rows.map((r) => [r.team_post_id, r.accepted_count]));
  return posts.map((p) => ({ ...p, accepted_count: counts.get(p.id) ?? 0 }));
}

export async function fetchApplicationsForPost(postId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`*,
      applicant:profiles!applications_applicant_id_fkey(id, display_name, college, course, skills, github_url)`)
    .eq('team_post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Application[];
}

export async function fetchMyApplications(userId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`*,
      team_post:team_posts(id, title, summary, category, status, owner_id, open_positions, commitment, deadline)`)
    .eq('applicant_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Application[];
}

export async function fetchMyPosts(userId: string): Promise<TeamPost[]> {
  const { data, error } = await supabase
    .from('team_posts')
    .select(POST_SELECT)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return attachCounts((data ?? []) as unknown as TeamPost[]);
}

export async function fetchMyApplicationForPost(
  postId: string,
  userId: string
): Promise<Application | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('team_post_id', postId)
    .eq('applicant_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Application) ?? null;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Profile) ?? null;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }) {
  const { error } = await supabase.from('profiles').upsert(profile);
  if (error) throw new Error(error.message);
}

export async function createTeamPost(
  post: Omit<TeamPost, 'id' | 'created_at' | 'updated_at' | 'owner' | 'accepted_count' | 'owner_id'> & { owner_id?: string }
) {
  const { data, error } = await supabase
    .from('team_posts')
    .insert(post)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateTeamPost(id: string, changes: Partial<TeamPost>) {
  const { error } = await supabase.from('team_posts').update(changes).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTeamPost(id: string) {
  const { error } = await supabase.from('team_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function submitApplication(teamPostId: string, introMessage: string) {
  const { error } = await supabase.from('applications').insert({
    team_post_id: teamPostId,
    intro_message: introMessage,
  });
  if (error) throw new Error(error.message);
}

export async function withdrawApplication(applicationId: string) {
  const { error } = await supabase
    .from('applications')
    .update({ status: 'withdrawn' as ApplicationStatus })
    .eq('id', applicationId);
  if (error) throw new Error(error.message);
}

export async function acceptApplication(applicationId: string) {
  const { error } = await supabase.rpc('accept_application', { app_id: applicationId });
  if (error) throw new Error(error.message);
}

export async function rejectApplication(applicationId: string) {
  const { error } = await supabase.rpc('reject_application', { app_id: applicationId });
  if (error) throw new Error(error.message);
}

export async function createReport(input: {
  team_post_id?: string | null;
  reported_user_id?: string | null;
  reason: string;
  details?: string | null;
}) {
  const { error } = await supabase.from('reports').insert(input);
  if (error) throw new Error(error.message);
}
