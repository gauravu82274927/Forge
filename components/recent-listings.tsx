'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CategoryBadge, StatusBadge } from '@/components/forge-badges';
import { Button } from '@/components/ui/button';
import { fetchTeamPosts } from '@/lib/data';
import type { TeamPost } from '@/lib/types';

export function RecentListings() {
  const [posts, setPosts] = useState<TeamPost[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTeamPosts({ status: 'all', sort: 'newest', excludeDemo: true, limit: 4 })
      .then(listings => { if (active) setPosts(listings); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  return (
    <section className="border-y border-border/70 bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight">Recent team listings</h2>
        <p className="mt-3 text-muted-foreground">See what student builders are working on.</p>
        {failed ? <p role="status" className="mt-6 text-sm">Couldn’t load recent listings. Try browsing all listings.</p>
          : posts === null ? <p role="status" className="mt-6 text-sm text-muted-foreground">Loading listings…</p>
          : posts.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">No team listings yet.</p>
          : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {posts.map(post => (
                <Link key={post.id} href={`/teams/${post.id}`}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-accent/60">
                  <div className="flex flex-wrap gap-2">
                    <CategoryBadge category={post.category} />
                    <StatusBadge status={post.status} />
                  </div>
                  <h3 className="mt-3 break-words font-semibold group-hover:underline">{post.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.summary}</p>
                  {post.required_skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {post.required_skills.slice(0, 3).map(skill => (
                        <span key={skill} className="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{skill}</span>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">{post.commitment}</p>
                </Link>
              ))}
            </div>
          )}
        <Button variant="ghost" asChild className="mt-6">
          <Link href="/teams?view=all">Browse all listings <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>
    </section>
  );
}
