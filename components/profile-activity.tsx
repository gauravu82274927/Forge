'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { acceptFriendRequest, fetchMyFriendships, sendFriendRequest } from '@/lib/data';
import type { Friendship } from '@/lib/types';
import { supabase } from '@/lib/supabase';

type Person = { id: string; display_name: string };
type Activity = { friend_count: number; friends: Person[] | null; hackathon_count: number; project_count: number };
type Review = { reviewer_id: string; reviewer: { display_name: string } | null; body: string };

function FriendList({ friends, userId }: { friends: Person[]; userId?: string }) {
  const [connections, setConnections] = useState<Friendship[]>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [revision, refresh] = useState(0);

  useEffect(() => {
    if (!userId || !friends.length) return;
    let active = true;
    void fetchMyFriendships().then(items => {
      if (active) setConnections(items);
    }).catch(() => {
      if (active) setNotice('Could not load friend actions.');
    });
    return () => { active = false; };
  }, [friends, userId, revision]);

  async function connect(person: Person, incoming?: Friendship) {
    setBusy(true);
    setNotice('');
    try {
      if (incoming) await acceptFriendRequest(incoming.id);
      else await sendFriendRequest(person.id);
      setNotice(incoming ? 'Friend request accepted.' : 'Friend request sent.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update this friendship.');
    } finally {
      setConnections(undefined);
      refresh(value => value + 1);
      setBusy(false);
    }
  }

  if (!friends.length) return <p className="mt-3 text-sm text-muted-foreground">No friends yet.</p>;

  return (
    <>
      <ul className="mt-3 max-h-60 divide-y overflow-y-auto" aria-label="Friends"
        tabIndex={friends.length > 5 ? 0 : undefined}>
        {friends.map(person => {
          const connection = connections?.find(item =>
            item.requester_id === person.id || item.addressee_id === person.id);
          const incoming = connection?.status === 'pending' && connection.addressee_id === userId
            ? connection : undefined;
          return (
            <li key={person.id} className="flex h-12 items-center justify-between gap-2 pr-2">
              <Link href={'/u/' + person.id} className="min-w-0 truncate text-sm underline underline-offset-4"
                title={person.display_name}>{person.display_name}</Link>
              {person.id === userId ? <span className="text-xs text-muted-foreground">You</span>
                : connection?.status === 'accepted' ? <span className="text-xs text-muted-foreground">Friends</span>
                : connection && !incoming ? <span className="text-xs text-muted-foreground">Request sent</span>
                : userId && connections && (
                  <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={busy}
                    aria-label={(incoming ? 'Accept request from ' : 'Add friend ') + person.display_name}
                    onClick={() => void connect(person, incoming)}>
                    {incoming ? 'Accept request' : 'Add friend'}
                  </Button>
                )}
            </li>
          );
        })}
      </ul>
      {notice && <p role="status" className="mt-2 text-sm text-muted-foreground">{notice}</p>}
    </>
  );
}

export function ProfileActivity({ id, userId }: { id: string; userId?: string }) {
  const [activity, setActivity] = useState<Activity>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligible, setEligible] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [revision, reload] = useState(0);
  const own = reviews.find(review => review.reviewer_id === userId);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.rpc('builder_activity', { target: id }),
      supabase.from('profile_reviews')
        .select('reviewer_id,body,reviewer:profiles!profile_reviews_reviewer_id_fkey(display_name)')
        .eq('profile_id', id).order('created_at', { ascending: false }).limit(25),
      userId && userId !== id ? supabase.rpc('can_review_builder', { target: id }) : null,
      userId && userId !== id ? supabase.from('profile_reviews').select('body')
        .eq('profile_id', id).eq('reviewer_id', userId).maybeSingle() : null,
    ]).then(([stats, feedback, access, mine]) => {
      if (!active) return;
      setActivity(stats.error ? undefined : stats.data);
      const items = (feedback.data ?? []) as unknown as Review[];
      if (mine?.data && userId && !items.some(review => review.reviewer_id === userId)) {
        items.push({ reviewer_id: userId, reviewer: { display_name: 'You' }, body: mine.data.body });
      }
      setReviews(items);
      setEligible(access?.data === true);
      setBody(mine?.data?.body ?? '');
      setLoaded(true);
      if (stats.error || feedback.error || access?.error || mine?.error) setNotice('Some profile activity could not be loaded.');
    });
    return () => { active = false; };
  }, [id, userId, revision]);

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !eligible) return;
    const cleaned = body.trim();
    if (cleaned.length < 10) {
      setNotice('Write at least 10 characters.');
      return;
    }
    setBusy(true);
    const request = own
      ? supabase.from('profile_reviews').update({ body: cleaned }).eq('profile_id', id).eq('reviewer_id', userId)
      : supabase.from('profile_reviews').insert({ profile_id: id, body: cleaned });
    const { error } = await request;
    setBusy(false);
    setNotice(error ? 'Could not save your review.' : 'Review saved.');
    if (!error) reload(version => version + 1);
  }

  async function removeReview() {
    if (!userId || !own) return;
    setBusy(true);
    const { error } = await supabase.from('profile_reviews').delete().eq('profile_id', id).eq('reviewer_id', userId);
    setBusy(false);
    setNotice(error ? 'Could not remove your review.' : 'Review removed.');
    if (!error) {
      setBody('');
      reload(version => version + 1);
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 sm:p-8" aria-label="Profile activity">
      {activity && (
        <>
          <dl className="grid grid-cols-3 gap-3">
            {[
              ['Friends', activity.friend_count],
              ['Hackathons marked participating', activity.hackathon_count],
              ['Forge projects joined or created', activity.project_count],
            ].map(([label, count]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-semibold">{count}</dd>
              </div>
            ))}
          </dl>
          {activity.friends !== null && (
            <details className="border-t pt-4">
              <summary className="cursor-pointer font-medium">Friends</summary>
              <FriendList friends={activity.friends} userId={userId} />
            </details>
          )}
        </>
      )}
      <div className="space-y-3 border-t pt-4">
        <h2 className="font-semibold">Teammate reviews</h2>
        <p className="text-sm text-muted-foreground">Only members of a shared Forge project can leave a public review.</p>
        {loaded && reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        {reviews.map(review => (
          <article key={review.reviewer_id} className="rounded-lg border p-4">
            <Link href={'/u/' + review.reviewer_id} className="text-sm font-medium hover:underline">{review.reviewer?.display_name || 'Forge teammate'}</Link>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{review.body}</p>
          </article>
        ))}
        {eligible && (
          <form onSubmit={saveReview} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="teammate-review">{own ? 'Edit your review' : 'Write a review'}</label>
            <Textarea id="teammate-review" value={body} onChange={event => setBody(event.target.value)}
              placeholder="What did they contribute to the project?" minLength={10} maxLength={600} required />
            <Button type="submit" disabled={busy}>Save public review</Button>
          </form>
        )}
        {own && <Button type="button" variant="outline" disabled={busy} onClick={() => void removeReview()}>Remove your review</Button>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      </div>
    </section>
  );
}
