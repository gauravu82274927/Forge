import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  FileText,
  Hammer,
  Layers,
  Palette,
  Smartphone,
  Sparkles,
  TerminalSquare,
  Users,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ForgeHeroVisual } from '@/components/forge-hero-visual';
import { CategoryBadge } from '@/components/forge-badges';

const sampleListings = [
  {
    title: 'AI-Powered Study Planner',
    category: 'AI / ML',
    skills: ['Python', 'React', 'LLM APIs'],
    roles: ['ML Engineer', 'Frontend'],
    positions: 2,
    commitment: '10-15 hrs/week',
    icon: Sparkles,
  },
  {
    title: 'Open-Source CLI for API Testing',
    category: 'Open Source',
    skills: ['Rust', 'CLI design', 'HTTP'],
    roles: ['Rust Developer', 'Docs'],
    positions: 2,
    commitment: '5-10 hrs/week',
    icon: TerminalSquare,
  },
  {
    title: 'Student Productivity App (SwiftUI)',
    category: 'Mobile App',
    skills: ['Swift', 'SwiftUI', 'iOS'],
    roles: ['iOS Developer', 'Design QA'],
    positions: 2,
    commitment: '8-12 hrs/week',
    icon: Smartphone,
  },
  {
    title: 'Sustainability Footprint Tracker',
    category: 'Sustainability',
    skills: ['TypeScript', 'PostgreSQL'],
    roles: ['Fullstack', 'Data Researcher'],
    positions: 2,
    commitment: '6-10 hrs/week',
    icon: Wrench,
  },
];

const skills = [
  { label: 'Frontend', icon: Layers },
  { label: 'Backend', icon: TerminalSquare },
  { label: 'Design', icon: Palette },
  { label: 'AI / ML', icon: Sparkles },
  { label: 'Mobile', icon: Smartphone },
  { label: 'Product', icon: Compass },
];

const steps = [
  {
    icon: Compass,
    title: 'Discover a project',
    text: 'Browse listings from students building AI tools, apps, open-source libraries, and more. Filter by the skills you have and the time you can give.',
  },
  {
    icon: FileText,
    title: 'Apply to join',
    text: 'Found a team that fits? Send a short intro with your skills and interests. Owners review every application — no cold DMs, no guessing.',
  },
  {
    icon: Hammer,
    title: 'Collaborate and build',
    text: 'Accepted into a team? Start shipping. Commitment and expectations are clear from day one, so everyone knows what they signed up for.',
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div>
            <Badge variant="outline" className="mb-5 border-accent/60 bg-accent/15 text-foreground">
              <Sparkles className="mr-1 h-3 w-3" />
              For students who build
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Find your people.{' '}
              <span className="relative inline-block">
                Build something real.
                <span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-accent" />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Great projects start with the right people. Discover teams, find
              collaborators who share your interests, and turn your ideas into
              something real.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/teams">
                  Find a Team <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/teams/new">Start Building</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ForgeHeroVisual />
          </div>
        </div>
      </section>

      {/* Sample listings */}
      <section className="border-y border-border/70 bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">
              Discover what you can build
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-muted-foreground">
              <p className="m-0">
                Example listings that show what a post looks like.
              </p>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                Demo data
              </Badge>
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sampleListings.map((item) => (
              <Link
                key={item.title}
                href="/teams"
                className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-accent/60 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
                  <item.icon className="h-5 w-5 text-foreground/70" />
                </div>
                <CategoryBadge category={item.category} />
                <h3 className="mt-2 font-semibold leading-snug">{item.title}</h3>
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.skills.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {item.positions} open positions · {item.commitment}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Button variant="ghost" asChild>
              <Link href="/teams">
                Browse all listings <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">How Forge works</h2>
            <p className="mt-3 text-muted-foreground">
              Three steps between working alone and building with a team.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative rounded-xl border border-border bg-card p-6">
                <span className="absolute right-5 top-4 text-4xl font-black text-border">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15">
                  <step.icon className="h-5 w-5 text-foreground/70" />
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Complementary skills */}
      <section className="border-y border-border/70 bg-secondary/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Build with complementary skills
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              The best student teams are not five people with the same resume.
              They are designers and backend developers, ML engineers and
              product thinkers — people whose strengths fit together. Forge
              helps you find the piece your team is missing.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium"
                >
                  <s.icon className="h-3.5 w-3.5 text-foreground/60" />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Users className="h-4 w-4" /> Roles teams often need
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                'Frontend developer',
                'Backend or ML engineer',
                'Designer',
                'Product thinker',
              ].map((role) => (
                <li
                  key={role}
                  className="rounded-lg border border-border bg-background px-3 py-2"
                >
                  {role}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-muted-foreground">
              Different strengths, one project. That is what makes a team work.
            </p>
          </div>
        </div>
      </section>

      {/* For project creators */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Badge variant="outline" className="mb-4">For project creators</Badge>
                <h2 className="text-3xl font-bold tracking-tight">
                  Have an idea? Publish a listing.
                </h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  Describe what you are building, the skills you need, and how
                  much time it takes. Then review applications in one place and
                  accept the teammates who fit.
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {[
                    'Set open roles, skills, and weekly commitment',
                    'Review incoming applications with context',
                    'Accept up to your capacity — positions close automatically',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2 text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8" asChild>
                  <Link href="/teams/new">
                    Post a listing <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-background p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">New application</span>
                  <Badge variant="outline">Pending</Badge>
                </div>
                <p className="mt-3 rounded-lg bg-secondary p-3 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;Hi! I have been building with React for two years and
                  would love to help with the study planner frontend. Here is a
                  scheduling UI I shipped last month…&rdquo;
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-md bg-[hsl(150_60%_90%)] px-3 py-1.5 text-xs font-semibold text-[hsl(150_60%_24%)]">
                    Accept
                  </span>
                  <span className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    Decline
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-foreground px-8 py-16 text-center text-background sm:px-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  'radial-gradient(500px circle at 50% 120%, hsl(76 85% 52% / 0.5), transparent 65%)',
              }}
            />
            <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
              Your next team is one listing away.
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-background/70">
              Whether you are looking to join or looking for teammates, Forge
              gets you from idea to team faster.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/teams">Discover teams</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
                asChild
              >
                <Link href="/teams/new">Post an opportunity</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
