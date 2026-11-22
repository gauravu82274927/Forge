'use client';

import Link from 'next/link';
import { eventFields, type EventField } from '@/lib/hackathon-event-fields';
import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, ExternalLink, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const statuses = {
  recruiting: 'Recruiting teammates',
  looking: 'Looking for a team',
  participating: 'Participating',
};

const sources = ['Devpost', 'Devfolio', 'Unstop', 'Other'] as const;
type Source = (typeof sources)[number];

type Event = {
  event_name: string;
  event_url: string;
  event_summary?: string | null;
  event_metadata?: Partial<Record<EventField, string>> | null;
};

const featuredEvent = {
  event_name: 'Food for Thought 2.0',
  event_url: 'https://foodforthoughtchallenge.in/',
};

function sourceFromUrl(value: string): Source {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === 'devpost.com' || host.endsWith('.devpost.com')) return 'Devpost';
    if (host === 'devfolio.co' || host.endsWith('.devfolio.co')) return 'Devfolio';
    if (host === 'unstop.com' || host.endsWith('.unstop.com')) return 'Unstop';
  } catch {
    return 'Other';
  }
  return 'Other';
}

type Listing = Event & {
  id: string;
  owner_id: string;
  source?: Source | null;
  team_url: string | null;
  application_url: string | null;
  status: keyof typeof statuses;
  details: string;
  owner: { display_name: string } | null;
};

function publicUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error('Use a public HTTPS link without credentials or a custom port.');
  }
  return url;
}

function eventUrl(value: string) {
  const url = publicUrl(value);
  for (const key of Array.from(url.searchParams.keys())) {
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  url.hash = '';
  url.hostname = url.hostname.replace(/^www\./, '');
  return url.href.replace(/\/(?=\?|$)/, match => url.pathname === '/' ? match : '');
}

function External({ url, label }: { url: string; label: string }) {
  if (!url.startsWith('https://')) return null;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">{label}<ExternalLink size={13} aria-hidden /></a>;
}

export function HackathonsHub() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formEvent, setFormEvent] = useState<Event | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    const { data, error } = await supabase.from('hackathon_listings')
      .select('*,owner:profiles(display_name)')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      setError('Could not load hackathon listings. Please try refreshing.');
      return;
    }
    setListings((data ?? []) as unknown as Listing[]);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    void refresh();
    return () => subscription.unsubscribe();
  }, []);

  const events = Array.from(new Map<string, Event>([...listings, featuredEvent].map(event => [event.event_url, event])).values());
  const filtered = events.filter(event => event.event_name.toLowerCase().includes(query.trim().toLowerCase()));
  const active = filtered.find(event => event.event_url === selected) ?? filtered[0];
  const participants = listings.filter(listing => listing.event_url === active?.event_url);

  async function importPreview(form: HTMLFormElement | null) {
    if (!form) return;
    const link = form.elements.namedItem('event_url') as HTMLInputElement;
    if (!link.reportValidity()) return;
    const originalUrl = link.value;
    setImporting(true);
    setError('');
    setNotice('');
    try {
      const url = publicUrl(originalUrl);
      const devpostEvent = url.hostname.match(/^([a-z0-9-]+)\.devpost\.com$/i);
      if (devpostEvent && !['www', 'info', 'help'].includes(devpostEvent[1])) {
        link.value = url.origin + '/';
        const name = form.elements.namedItem('event_name') as HTMLInputElement;
        if (!name.value.trim()) {
          name.value = devpostEvent[1] === 'buildyourownwebsite'
            ? 'Build Your Own Website'
            : devpostEvent[1].split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').slice(0, 100);
        }
        (form.elements.namedItem('source') as HTMLSelectElement).value = 'Devpost';
        setNotice('Devpost link ready. Check the event name and enter the details you want to share.');
        return;
      }
      const response = await fetch('/api/hackathon-preview?' + new URLSearchParams({ url: originalUrl }));
      const preview = await response.json();
      if (originalUrl !== link.value || !form.isConnected) return;
      if (!response.ok) throw new Error(preview.error);
      link.value = preview.eventUrl;
      (form.elements.namedItem('event_name') as HTMLInputElement).value = preview.title;
      (form.elements.namedItem('event_summary') as HTMLTextAreaElement).value = preview.summary;
      (form.elements.namedItem('source') as HTMLSelectElement).value = preview.source;
      for (const [field] of eventFields) {
        const input = form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement;
        if (preview.metadata?.[field]) input.value = preview.metadata[field];
      }
      setNotice('Review the imported details and fill in any missing fields before publishing.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not import event details.');
    } finally {
      setImporting(false);
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? '').trim();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const url = eventUrl(value('event_url'));
      const metadata = Object.fromEntries(eventFields.map(([field]) => [field, value(field)]).filter(([, fieldValue]) => fieldValue));
      const record = {
        ...(Object.keys(metadata).length ? { event_metadata: metadata } : {}),
        event_name: value('event_name'),
        event_url: url,
        source: value('source'),
        ...(value('event_summary') ? { event_summary: value('event_summary') } : {}),
        status: value('status'),
        details: value('details'),
        team_url: value('team_url') ? publicUrl(value('team_url')).href : null,
        application_url: value('application_url') ? publicUrl(value('application_url')).href : null,
      };
      const { error } = await supabase.from('hackathon_listings').insert(record);
      if (error) throw new Error(error.code === '23505' ? 'You already have a listing for this hackathon.' : 'Could not publish your listing. Check your sign-in and try again.');
      setShowForm(false);
      setQuery('');
      setSelected(url);
      setNotice('Listing published.');
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not publish your listing.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error } = await supabase.from('hackathon_listings').delete().eq('id', id);
      if (error) setError('Could not remove your listing.');
      else {
        setNotice('Listing removed.');
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="flex flex-wrap items-end justify-between gap-6 border-b pb-8">
        <div>
          <CalendarDays className="mb-4 text-primary" aria-hidden />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Hackathons</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Find people building for the same event, join a team, or post the roles you need.</p>
        </div>
        {userId
          ? <Button onClick={() => { setFormEvent(null); setShowForm(!showForm); setError(''); }}><Plus className="mr-2 h-4 w-4" />{showForm ? 'Close form' : 'Post a listing'}</Button>
          : <Button asChild><Link href="/login">Sign in to post</Link></Button>}
      </section>

      {!isSupabaseConfigured && <p className="my-4 text-muted-foreground">Connect Supabase to load and publish listings.</p>}
      {error && <p role="alert" className="my-4 text-destructive">{error}</p>}
      {notice && <p role="status" className="my-4 text-sm">{notice}</p>}
      {showForm && userId && (
        <form key={formEvent?.event_url ?? 'new'} onSubmit={publish} className="my-8 grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Post a hackathon listing</h2>
          <label className="grid gap-1.5 text-sm">Hackathon name<Input name="event_name" required minLength={2} maxLength={100} defaultValue={formEvent?.event_name} /></label>
          <label className="grid gap-1.5 text-sm">Official event link<Input name="event_url" required type="url" maxLength={1500} defaultValue={formEvent?.event_url} placeholder="https://…" /></label>
          <div className="sm:col-span-2">
            <Button type="button" variant="outline" disabled={importing || busy}
              onClick={event => void importPreview(event.currentTarget.form)}>
              {importing ? 'Importing…' : 'Import from link'}
            </Button>
          </div>
          <label className="grid gap-1.5 text-sm sm:col-span-2">Event overview (optional)
            <Textarea name="event_summary" maxLength={500} rows={2} defaultValue={formEvent?.event_summary ?? ''} />
          </label>
          {eventFields.map(([field, label, limit]) => (
            <label key={field} className={field === 'event_details' ? 'grid gap-1.5 text-sm sm:col-span-2' : 'grid gap-1.5 text-sm'}>
              {label} (optional)
              {field === 'event_details'
                ? <Textarea name={field} maxLength={limit} rows={5} defaultValue={formEvent?.event_metadata?.[field] ?? ''} />
                : <Input name={field} maxLength={limit} defaultValue={formEvent?.event_metadata?.[field] ?? ''} />}
            </label>
          ))}
          <label className="grid gap-1.5 text-sm">Event platform
            <select name="source" className="h-10 rounded-md border bg-background px-3"
              defaultValue={formEvent ? sourceFromUrl(formEvent.event_url) : ''} required>
              <option value="" disabled>Select a platform</option>
              {sources.map(source => <option key={source}>{source}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">Public team link (optional)<Input name="team_url" type="url" maxLength={1500} placeholder="https://…" /></label>
          <label className="grid gap-1.5 text-sm">Public application link (optional)<Input name="application_url" type="url" maxLength={1500} placeholder="https://…" /></label>
          <label className="grid gap-1.5 text-sm">Your status<select name="status" className="h-10 rounded-md border bg-background px-3">
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">Roles, skills, or what you plan to build<Textarea name="details" maxLength={500} rows={3} /></label>
          <p className="text-sm text-muted-foreground sm:col-span-2">Use the same official event link to appear with other participants. Post only links you want to share publicly.</p>
          <div><Button type="submit" disabled={busy || importing}>{busy ? 'Publishing…' : 'Publish listing'}</Button></div>
        </form>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <label className="block text-sm font-semibold" htmlFor="event-search">Find a hackathon</label>
          <Input id="event-search" placeholder="Search by name" value={query} onChange={event => setQuery(event.target.value)} />
          <ul className="space-y-2">
            {filtered.map(event => (
              <li key={event.event_url}>
                <button type="button" aria-pressed={event.event_url === active?.event_url} onClick={() => setSelected(event.event_url)}
                  className="w-full rounded-lg border px-4 py-3 text-left text-sm font-medium hover:bg-accent aria-pressed:bg-accent">
                  {event.event_name}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="min-w-0 space-y-4">
          {loading && <p role="status">Loading hackathons…</p>}
          {!loading && !active && !error && <p className="rounded-xl border p-6 text-muted-foreground">{query ? 'No hackathons match your search.' : 'No hackathon listings yet. Post one to start the conversation.'}</p>}
          {active && (
            <>
              <div className="rounded-xl border bg-muted/40 p-5 sm:p-7">
                <h2 className="break-words text-2xl font-bold">{active.event_name}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Users size={16} aria-hidden />{participants.length} on Forge</span>
                  <External url={active.event_url} label={active.event_url === featuredEvent.event_url ? "Official details and registration" : "Official event page"} />
                  {userId && <Button size="sm" variant="outline" onClick={() => { setFormEvent(active); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Post for this event</Button>}
                </div>
              </div>
              {active.event_url === featuredEvent.event_url && (
                <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-7">
                  <h3 className="text-lg font-semibold">About the event</h3>
                  <p className="text-sm text-muted-foreground">Swiggy’s student case study competition asks teams to identify a need on campus and propose a solution for college students in India.</p>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Organizer</dt><dd className="font-medium">Swiggy</dd></div>
                    <div><dt className="text-muted-foreground">Team size</dt><dd className="font-medium">2–4 students from the same college</dd></div>
                    <div><dt className="text-muted-foreground">Registration closes</dt><dd className="font-medium">25 November 2026</dd></div>
                    <div><dt className="text-muted-foreground">Submission deadline (tentative)</dt><dd className="font-medium">15 December 2026</dd></div>
                  </dl>
                </section>
              )}
              {active.event_url !== featuredEvent.event_url && (() => {
                const summary = participants.find(listing => listing.event_summary)?.event_summary;
                const metadata = Object.fromEntries(eventFields.map(([field]) => [
                  field, participants.find(listing => typeof listing.event_metadata?.[field] === 'string' && listing.event_metadata[field])?.event_metadata?.[field],
                ]));
                return (summary || Object.values(metadata).some(Boolean)) ? <section className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold">About the event</h3>
                  {summary && <p className="mt-2 break-words text-sm text-muted-foreground">{summary}</p>}
                  {metadata.event_details && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{metadata.event_details}</p>}
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    {eventFields.filter(([field]) => field !== 'event_details' && metadata[field]).map(([field, label]) => (
                      <div key={field}><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{metadata[field]}</dd></div>
                    ))}
                  </dl>
                </section> : null;
              })()}
              <h3 className="text-lg font-semibold">People and teams</h3>
              {participants.length === 0 && <p className="rounded-xl border p-5 text-sm text-muted-foreground">No one has posted for this event yet.</p>}
              {participants.map(listing => (
                <article key={listing.id} className="rounded-xl border bg-card p-5">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">{statuses[listing.status]} · {listing.source ?? sourceFromUrl(listing.event_url)}</p>
                  <Link className="font-semibold hover:underline" href={'/u/' + listing.owner_id}>{listing.owner?.display_name || 'Forge builder'}</Link>
                  {listing.details && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{listing.details}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {listing.team_url && <External url={listing.team_url} label="Team page" />}
                    {listing.application_url && <External url={listing.application_url} label="Application page" />}
                    {listing.owner_id === userId && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void remove(listing.id)}>Remove listing</Button>}
                  </div>
                </article>
              ))}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
