'use client';

import Link from 'next/link';
import { eventFields, type EventField } from '@/lib/hackathon-event-fields';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, ExternalLink, Plus, Users } from 'lucide-react';
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

function LinkedText({ text }: { text: string }) {
  return <>{text.split(/(\b(?:https?:\/\/|www\.)[^\s<>"']+)/gi).map((part, index) => {
    if (index % 2 === 0) return part;
    const label = part.replace(/[.,;:!?]+$/, '');
    try {
      const url = new URL(/^www\./i.test(label) ? 'https://' + label : label);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return part;
      return <span key={index}>
        <a href={url.href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
          {label}
        </a>{part.slice(label.length)}
      </span>;
    } catch {
      return part;
    }
  })}</>;
}

function EventDescription({ title, summary, details }: { title: string; summary?: string | null; details?: string }) {
  const normalize = (line: string) => line.trim().toLowerCase();
  const paragraphs = details?.split(/\r?\n/).map(line => line.trim()).filter(line =>
    line && !/^(?:[-*_]\s*){3,}$/.test(line) &&
    normalize(line) !== normalize(title) && normalize(line) !== normalize(summary ?? '')
  ) ?? [];
  const id = useId();
  const content = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      setOverflows(element.getBoundingClientRect().height > lineHeight * 10 + 0.5);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [summary, details]);

  return (
    <>
      <div id={id} className={expanded ? 'mt-3' : 'mt-3 max-h-[15rem] overflow-hidden'}>
        <div ref={content} className="break-words text-sm leading-6">
          {summary && <p className="font-medium"><LinkedText text={summary} /></p>}
          {paragraphs.length > 0 && (
            <div className="mt-2 space-y-2 text-muted-foreground">
              {paragraphs.map((paragraph, index) => <p key={index}><LinkedText text={paragraph} /></p>)}
            </div>
          )}
        </div>
      </div>
      {overflows && (
        <Button type="button" variant="ghost" size="sm" className="mt-2"
          aria-controls={id} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Show less' : 'Show more'}
          {expanded ? <ChevronUp className="ml-1 h-4 w-4" aria-hidden /> : <ChevronDown className="ml-1 h-4 w-4" aria-hidden />}
        </Button>
      )}
    </>
  );
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
