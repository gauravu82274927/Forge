'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Github,
  GraduationCap,
  Linkedin,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollegeCombobox } from '@/components/college-combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth-provider';
import { fetchProfile, upsertProfile } from '@/lib/data';
import {
  AVAILABILITY_OPTIONS,
  EXPERIENCE_LEVELS,
  ROLE_OPTIONS,
  SKILL_OPTIONS,
  type Profile,
} from '@/lib/types';

export function ProfileEditor() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchProfile(user.id)
      .then((p) => {
        setProfile(
          p ?? {
            id: user.id,
            display_name: '',
            college: null,
            course: null,
            graduation_year: null,
            bio: null,
            skills: [],
            interests: [],
            experience_level: null,
            portfolio_url: null,
            github_url: null,
            linkedin_url: null,
            preferred_roles: [],
            availability: null,
            created_at: '',
            updated_at: '',
          }
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="h-12 w-64 animate-pulse rounded bg-secondary" />
        <div className="mt-8 h-96 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Sign in to edit your profile</h1>
        <p className="mt-2 text-muted-foreground">
          Your profile tells team owners who you are and what you bring.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><Link href="/login">Sign In</Link></Button>
          <Button variant="outline" asChild><Link href="/signup">Create Account</Link></Button>
        </div>
      </div>
    );
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  };

  const toggleSkill = (skill: string, key: 'skills' | 'interests' | 'preferred_roles') => {
    const arr = profile[key] ?? [];
    set(key, arr.includes(skill) ? arr.filter((s) => s !== skill) : [...arr, skill]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await upsertProfile({
        id: user.id,
        display_name: profile.display_name.trim() || 'New builder',
        college: profile.college?.trim() || null,
        course: profile.course?.trim() || null,
        graduation_year: profile.graduation_year || null,
        bio: profile.bio?.trim() || null,
        skills: profile.skills,
        interests: profile.interests,
        experience_level: profile.experience_level,
        portfolio_url: profile.portfolio_url?.trim() || null,
        github_url: profile.github_url?.trim() || null,
        linkedin_url: profile.linkedin_url?.trim() || null,
        preferred_roles: profile.preferred_roles,
        availability: profile.availability,
      });
      await refreshProfile();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const initials = (profile.display_name || user.email || 'U')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-accent text-lg font-bold text-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your profile</h1>
          <p className="text-sm text-muted-foreground">
            Team owners see this when you apply. Your email stays private.
          </p>
        </div>
      </div>

      {saved && (
        <p className="mt-4 rounded-lg border border-[hsl(150_60%_40%_/_0.3)] bg-[hsl(150_60%_45%_/_0.08)] p-3 text-sm font-medium text-[hsl(150_55%_28%)]">
          Profile saved.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={profile.display_name ?? ''}
              onChange={(e) => set('display_name', e.target.value)}
              placeholder="Maya Chen"
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="college">College / university</Label>
            <CollegeCombobox
              id="college"
              value={profile.college ?? ''}
              onChange={(v) => set('college', v)}
              placeholder="Start typing your college"
              maxLength={120}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="course">Course / field</Label>
            <Input
              id="course"
              value={profile.course ?? ''}
              onChange={(e) => set('course', e.target.value)}
              placeholder="Computer Science"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grad-year">Graduation year</Label>
            <Input
              id="grad-year"
              type="number"
              min={2020}
              max={2040}
              value={profile.graduation_year ?? ''}
              onChange={(e) =>
                set('graduation_year', e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Experience level</Label>
            <Select
              value={profile.experience_level ?? undefined}
              onValueChange={(v) => set('experience_level', v as Profile['experience_level'])}
            >
              <SelectTrigger aria-label="Experience level">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.filter((e) => e.value !== 'any').map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Short introduction</Label>
          <Textarea
            id="bio"
            value={profile.bio ?? ''}
            onChange={(e) => set('bio', e.target.value)}
            rows={3}
            placeholder="What do you build? What are you looking for?"
            maxLength={400}
          />
          <p className="text-xs text-muted-foreground">{(profile.bio ?? '').length}/400</p>
        </div>

        <TagSection
          label="Technical skills"
          hint="Pick what you actually work with"
          options={[...SKILL_OPTIONS]}
          selected={profile.skills}
          onToggle={(v) => toggleSkill(v, 'skills')}
        />

        <TagSection
          label="Interests"
          hint="What topics excite you"
          options={['AI/ML', 'Open source', 'Web', 'Mobile', 'Games', 'Design', 'Sustainability', 'Fintech', 'Education', 'Robotics', 'AR/VR', 'Security']}
          selected={profile.interests}
          onToggle={(v) => toggleSkill(v, 'interests')}
        />

        <TagSection
          label="Preferred roles"
          hint="What you like to work on"
          options={[...ROLE_OPTIONS]}
          selected={profile.preferred_roles}
          onToggle={(v) => toggleSkill(v, 'preferred_roles')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Availability</Label>
            <Select
              value={profile.availability ?? undefined}
              onValueChange={(v) => set('availability', v)}
            >
              <SelectTrigger aria-label="Availability">
                <SelectValue placeholder="How much time?" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portfolio">Portfolio link (optional)</Label>
            <Input
              id="portfolio"
              value={profile.portfolio_url ?? ''}
              onChange={(e) => set('portfolio_url', e.target.value)}
              placeholder="https://your-site.dev"
              type="url"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="github">GitHub (optional)</Label>
            <Input
              id="github"
              value={profile.github_url ?? ''}
              onChange={(e) => set('github_url', e.target.value)}
              placeholder="https://github.com/you"
              type="url"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin">LinkedIn (optional)</Label>
            <Input
              id="linkedin"
              value={profile.linkedin_url ?? ''}
              onChange={(e) => set('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/you"
              type="url"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-4">
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-[hsl(150_55%_28%)]">
              <Sparkles className="h-3.5 w-3.5" /> All set
            </span>
          )}
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Save profile</>
            )}
          </Button>
        </div>
      </div>

      {/* Public preview */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          How owners see you
        </h2>
        <div className="mt-3 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-accent font-bold text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{profile.display_name || 'Your name'}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                {[profile.course, profile.college].filter(Boolean).join(' · ') || 'Add your university'}
                {profile.graduation_year ? ` · ${profile.graduation_year}` : ''}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {profile.github_url && <Github className="h-4 w-4 text-muted-foreground" />}
              {profile.linkedin_url && <Linkedin className="h-4 w-4 text-muted-foreground" />}
              {profile.portfolio_url && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          {profile.bio && (
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">{profile.bio}</p>
          )}
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-1.5">
            {(profile.skills.length ? profile.skills : ['Add your skills']).map((s) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
          </div>
          {profile.availability && (
            <p className="mt-3 text-xs text-muted-foreground">
              Available: {profile.availability}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TagSection({
  label,
  hint,
  options,
  selected,
  onToggle,
}: {
  label: string;
  hint: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-background p-3">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
