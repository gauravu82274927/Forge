import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  GitBranch,
  Terminal,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForgeHeroVisual } from "@/components/forge-hero-visual";
import { RecentListings } from "@/components/recent-listings";
const steps = [
  {
    icon: Code2,
    title: "Find your kind of build.",
    text: "Explore projects by skills, interests, and the time you can give. Find an idea you want to bring to life.",
  },
  {
    icon: Users,
    title: "Meet your missing pieces.",
    text: "Send an introduction or post the roles you need. Connect with people whose strengths complement yours.",
  },
  {
    icon: GitBranch,
    title: "Make the first commit.",
    text: "Get your team together, align on the work, and turn that side-project idea into something real.",
  },
];
export default function Home() {
  return (
    <>
      <section className="forge-hero">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between border-b border-border/60 py-5">
            <p className="forge-eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> A place
              for student builders
            </p>
            <span className="forge-eyebrow hidden sm:block">
              Ideas → People → Projects
            </span>
          </div>
          <div className="grid items-center gap-4 pb-12 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pb-20 lg:pt-16">
            <div className="relative z-10">
              <p className="forge-eyebrow mb-6">
                Good code starts with good company.
              </p>
              <h1 className="forge-title">
                Less solo.
                <br />
                More{" "}
                <span className="text-[hsl(76_70%_32%)] dark:text-accent">
                  shipped.
                </span>
              </h1>
              <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Find your next hackathon team, your project co-builder, or the
                skill your idea is missing.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/teams">
                    Find your team <ArrowUpRight className="ml-3 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/teams/new">
                    Post a project <span className="ml-3 font-mono">+</span>
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <Terminal size={14} />
                <span>For the ones who would rather build.</span>
              </div>
            </div>
            <ForgeHeroVisual />
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border/60 py-5 font-mono text-xs text-muted-foreground">
            <span className="text-foreground">Every stack. One community.</span>
            {["React", "Python", "Rust", "Figma", "Swift", "PyTorch"].map(
              (s) => (
                <span key={s}>{s}</span>
              ),
            )}
          </div>
        </div>
      </section>
      <RecentListings />
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="forge-eyebrow mb-5">02 / From idea to first commit</p>
            <h2 className="text-4xl font-semibold leading-tight">
              Great things
              <br />
              aren’t built alone.
            </h2>
            <p className="mt-5 max-w-xs leading-relaxed text-muted-foreground">
              Your idea deserves more than another abandoned repository.
            </p>
          </div>
          <div>
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="forge-step grid grid-cols-[36px_1fr] gap-4"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  0{i + 1}
                </span>
                <div>
                  <step.icon size={20} className="mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-2">
        <Link
          href="/hackathons"
          className="forge-panel group relative overflow-hidden p-8 sm:p-10"
        >
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full border-[28px] border-accent/10" />
          <Zap size={24} />
          <p className="forge-eyebrow mb-4 mt-12">Built for the deadline</p>
          <h2 className="text-3xl font-semibold">
            Same event.
            <br />
            Your kind of team.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Find others entering your hackathon and fill the roles you need
            before the clock starts.
          </p>
          <span className="mt-8 flex items-center gap-3 text-sm font-medium">
            Explore hackathons{" "}
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
            />
          </span>
        </Link>
        <div className="forge-panel overflow-hidden p-8 sm:p-10">
          <p className="forge-eyebrow mb-8">03 / Assemble your crew</p>
          <div className="space-y-2">
            {[
              "Frontend developer",
              "Backend engineer",
              "Product designer",
              "AI / ML builder",
            ].map((role, i) => (
              <div
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3 font-mono text-xs"
                key={role}
              >
                <span className="text-muted-foreground">0{i + 1}</span>
                <span>{role}</span>
                <Code2 size={14} className="text-muted-foreground" />
              </div>
            ))}
          </div>
          <h2 className="mt-8 text-2xl font-semibold">
            Your idea. Their superpower.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Define your open roles, review applications, and build a team with
            different strengths.
          </p>
          <Button variant="outline" asChild className="mt-6">
            <Link href="/teams/new">
              Create a listing <ArrowRight size={14} className="ml-3" />
            </Link>
          </Button>
        </div>
      </section>
      <section className="border-y border-border bg-accent text-black">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-widest">
              Your next chapter starts with a team.
            </p>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Let’s build something.
            </h2>
          </div>
          <Button
            asChild
            size="lg"
            className="border-black bg-black text-white hover:bg-black/80"
          >
            <Link href="/teams">
              Find your people <ArrowUpRight className="ml-4 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
