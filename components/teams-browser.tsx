'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Clock,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryBadge, EmptyState, SkillOverflow } from '@/components/forge-badges';
import { Badge } from '@/components/ui/badge';
import { fetchTeamPosts, type TeamPostQuery } from '@/lib/data';
import {
  CATEGORIES,
  COMMITMENTS,
  EXPERIENCE_LEVELS,
  type TeamPost,
} from '@/lib/types';
import { formatDeadline } from '@/lib/format';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'positions', label: 'Most open positions' },
];

export function TeamsBrowser() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [experience, setExperience] = useState('');
  const [commitment, setCommitment] = useState('');
  const [sort, setSort] = useState('newest');
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useMemo<TeamPostQuery>(
    () => ({
      search: debounced,
      category: category || undefined,
      experience: experience || undefined,
      commitment: commitment || undefined,
      sort: sort as TeamPostQuery['sort'],
    }),
    [debounced, category, experience, commitment, sort]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTeamPosts(query)
      .then((data) => {
        if (!cancelled) setPosts(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const hasFilters = Boolean(search || category || experience || commitment);
  const reset = () => {
    setSearch('');
    setCategory('');
    setExperience('');
    setCommitment('');
    setSort('newest');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Find your next team.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Browse open listings from students and developers building real
          projects. Filter by what you know and the time you have.
        </p>
      </div>

      {/* Search + sort */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, skills, keywords…"
            className="h-11 pl-9"
            aria-label="Search team listings"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-11 w-full sm:w-52" aria-label="Sort listings">
            <SlidersHorizontal className="mr-1 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Select value={category || 'all'} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44" aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={experience || 'all'} onValueChange={(v) => setExperience(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44" aria-label="Filter by experience level">
            <SelectValue placeholder="Experience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any experience</SelectItem>
            {EXPERIENCE_LEVELS.filter((e) => e.value !== 'any').map((e) => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={commitment || 'all'} onValueChange={(v) => setCommitment(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44" aria-label="Filter by time commitment">
            <SelectValue placeholder="Commitment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any commitment</SelectItem>
            {COMMITMENTS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="mr-1 h-3.5 w-3.5" /> Reset filters
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {loading ? 'Loading…' : `${posts.length} listing${posts.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Results */}
      <div className="mt-8">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Something went wrong loading listings: {error}
          </div>
        )}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-6 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 && !error ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="No listings match your filters"
            description="Try different keywords or clear a filter or two — new projects are posted regularly."
            action={
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 transition-opacity md:grid-cols-2">
            {posts.map((post, i) => (
              <TeamCard key={post.id} post={post} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCard({ post, index }: { post: TeamPost; index: number }) {
  return (
    <Link
      href={`/teams/${post.id}`}
      className="group block animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-border bg-card p-6 duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-md"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={post.category} />
          {post.is_demo && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Demo
            </Badge>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {post.accepted_count ?? 0}/{post.open_positions} filled
        </span>
      </div>
      <h2 className="mt-3 text-lg font-semibold leading-snug group-hover:underline decoration-accent decoration-2 underline-offset-4">
        {post.title}
      </h2>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {post.summary}
      </p>
      <SkillOverflow skills={post.required_skills} />
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {post.open_roles.slice(0, 2).join(', ')}
          {post.open_roles.length > 2 && ` +${post.open_roles.length - 2}`}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {post.commitment}
        </span>
        {post.deadline && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatDeadline(post.deadline)}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        Posted by {post.owner?.display_name ?? 'a student builder'}
      </p>
    </Link>
  );
}
