import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Hammer, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About',
  description: 'Why Forge exists and who it is for.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">About Forge</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
        <p>
          Forge started from a simple observation: the hardest part of any
          student project is rarely the code — it is finding the two or three
          people you want to build it with.
        </p>
        <p>
          Classmates have different schedules, different skill levels, and
          different levels of commitment. Group chats fizzle. Cold messages go
          unanswered. Good project ideas die not because nobody could build
          them, but because nobody could find each other.
        </p>
        <p>
          Forge fixes that with transparent team listings: what is being built,
          what skills are needed, how much time it takes, and when applications
          close. You apply with a short intro — not a resume dump — and owners
          respond in one place.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Compass, title: 'Discover', text: 'Browse real listings filtered by your skills and time.' },
          { icon: Sparkles, title: 'Connect', text: 'Apply with a short, honest intro. No cold DMs.' },
          { icon: Hammer, title: 'Build', text: 'Commitment is clear from day one. Then you ship.' },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-card p-5">
            <c.icon className="h-5 w-5 text-foreground/70" />
            <h2 className="mt-3 font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex gap-3">
        <Button asChild>
          <Link href="/teams">Discover teams</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
}
