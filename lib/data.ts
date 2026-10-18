import { supabase } from '@/lib/supabase';
import { ROLE_OPTIONS, SKILL_OPTIONS } from '@/lib/types';
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  Message,
  Friendship,
  PersonResult,
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
  owner:profiles!team_posts_owner_id_fkey(id, display_name, college, course, github_url, avatar_url)`;

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
      applicant:profiles!applications_applicant_id_fkey(id, display_name, college, course, skills, github_url, avatar_url)`)
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

// ---------------------------------------------------------------------------
// Search and friends
// ---------------------------------------------------------------------------

function cleanTerm(raw: string): string {
  return raw.trim().replace(/[%,()*\\]/g, ' ').replace(/\s+/g, ' ');
}

/** Tag columns match exactly, so map what was typed onto the real option names. */
function matchTags(term: string, options: readonly string[]): string[] {
  const t = term.toLowerCase();
  return options.filter((o) => o.toLowerCase().includes(t)).slice(0, 5);
}

function tagFilter(column: string, tags: string[]): string[] {
  return tags.map((t) => `${column}.cs.{"${t.replace(/"/g, '')}"}`);
}

/** Search people by name, college, course or a skill/interest tag. */
export async function searchPeople(
  query: string,
  excludeUserId?: string,
  limit = 8
): Promise<PersonResult[]> {
  const term = cleanTerm(query);
  if (term.length < 2) return [];
  const skills = matchTags(term, SKILL_OPTIONS);
  const filters = [
    `display_name.ilike.%${term}%`,
    `college.ilike.%${term}%`,
    `course.ilike.%${term}%`,
    ...tagFilter('skills', skills),
    ...tagFilter('interests', skills),
  ];
  let req = supabase
    .from('profiles')
    .select('id, display_name, college, course, skills, experience_level, avatar_url')
    .or(filters.join(','))
    .order('display_name', { ascending: true })
    .limit(limit);
  if (excludeUserId) req = req.neq('id', excludeUserId);
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PersonResult[];
}

/** Search open listings by title, summary, description, category, role or skill. */
export async function searchProjects(query: string, limit = 8): Promise<TeamPost[]> {
  const term = cleanTerm(query);
  if (term.length < 2) return [];
  const filters = [
    `title.ilike.%${term}%`,
    `summary.ilike.%${term}%`,
    `description.ilike.%${term}%`,
    `category.ilike.%${term}%`,
    ...tagFilter('required_skills', matchTags(term, SKILL_OPTIONS)),
    ...tagFilter('open_roles', matchTags(term, ROLE_OPTIONS)),
  ];
  const { data, error } = await supabase
    .from('team_posts')
    .select(POST_SELECT)
    .eq('status', 'open')
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TeamPost[];
}

const FRIEND_SELECT = `*,
  requester:profiles!friendships_requester_id_fkey(id, display_name, college, course, avatar_url),
  addressee:profiles!friendships_addressee_id_fkey(id, display_name, college, course, avatar_url)`;

export async function fetchMyFriendships(): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIEND_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Friendship[];
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .insert({ addressee_id: addresseeId });
  if (error) {
    if (error.code === '23505') throw new Error('A request already exists with this person.');
    throw new Error(error.message);
  }
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
  if (error) throw new Error(error.message);
}

/** Cancel a sent request, decline a received one, or remove a friend. */
export async function removeFriendship(id: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Messages and notifications
// ---------------------------------------------------------------------------

export async function fetchConversation(otherId: string, myId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`
    )
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(recipientId: string, body: string): Promise<void> {
  const text = body.trim();
  if (!text) return;
  const { error } = await supabase
    .from('messages')
    .insert({ recipient_id: recipientId, body: text });
  if (error) {
    if (error.code === '42501') throw new Error('You can only message people you are friends with.');
    throw new Error(error.message);
  }
}

/** Delete one of my own messages for everyone. The text is erased on the server. */
export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_message', { msg_id: messageId });
  if (error) throw new Error(error.message);
}

export async function markConversationRead(otherId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { other_id: otherId });
  if (error) throw new Error(error.message);
}

/** Unread messages sent to me, newest first, with the sender's name. */
export async function fetchUnreadMessages(myId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id, display_name)')
    .eq('recipient_id', myId)
    .is('read_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Message[];
}

/** Latest message per friend, so the chat list can show a preview and ordering. */
export async function fetchLatestMessages(myId: string): Promise<Map<string, Message>> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const latest = new Map<string, Message>();
  for (const m of (data ?? []) as unknown as Message[]) {
    const other = m.sender_id === myId ? m.recipient_id : m.sender_id;
    if (!latest.has(other)) latest.set(other, m);
  }
  return latest;
}

export async function fetchNotificationsSeenAt(myId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notifications_seen_at')
    .eq('id', myId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { notifications_seen_at?: string } | null)?.notifications_seen_at ?? null;
}

export async function markNotificationsSeen(myId: string): Promise<string> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({ notifications_seen_at: now })
    .eq('id', myId);
  if (error) throw new Error(error.message);
  return now;
}

/** New applications to my listings, and accept/decline decisions on mine. */
export async function fetchApplicationEvents(myId: string): Promise<ApplicationEvent[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(
      `id, status, applicant_id, created_at, updated_at,
       team_post:team_posts(id, title),
       applicant:profiles!applications_applicant_id_fkey(display_name)`
    )
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    status: string;
    applicant_id: string;
    created_at: string;
    updated_at: string;
    team_post: { id: string; title: string } | null;
    applicant: { display_name: string } | null;
  };
  const events: ApplicationEvent[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.team_post) continue;
    if (r.applicant_id === myId) {
      if (r.status === 'accepted' || r.status === 'rejected') {
        events.push({
          id: r.id,
          kind: r.status,
          created_at: r.updated_at,
          postId: r.team_post.id,
          postTitle: r.team_post.title,
        });
      }
    } else if (r.status === 'pending') {
      events.push({
        id: r.id,
        kind: 'applied',
        created_at: r.created_at,
        postId: r.team_post.id,
        postTitle: r.team_post.title,
        person: r.applicant?.display_name ?? 'A student',
      });
    }
  }
  return events.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------------------------------------------------------------------------
// Profile pictures
// ---------------------------------------------------------------------------

const AVATAR_BUCKET = 'avatars';

/** Storage path inside the bucket for a public avatar URL, or null if it is not one of ours. */
function avatarPathFromUrl(url: string): string | null {
  const marker = `/${AVATAR_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

async function removeAvatarFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const path = avatarPathFromUrl(url);
  if (!path) return;
  // Best effort: a leftover file is harmless, so failures are ignored.
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}

/** Upload a prepared image as the user's profile picture and return its public URL. */
export async function uploadAvatar(
  userId: string,
  image: Blob,
  previousUrl?: string | null
): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, image, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new Error(error.message);

  const url = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (updateError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    throw new Error(updateError.message);
  }
  await removeAvatarFile(previousUrl);
  return url;
}

export async function removeAvatar(userId: string, currentUrl: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (error) throw new Error(error.message);
  await removeAvatarFile(currentUrl);
}
