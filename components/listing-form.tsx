'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/components/auth-provider';
import { createTeamPost, fetchTeamPost, updateTeamPost } from '@/lib/data';
import {
  CATEGORIES,
  COLLAB_FORMATS,
  COMMITMENTS,
  EXPERIENCE_LEVELS,
  ROLE_OPTIONS,
  SKILL_OPTIONS,
} from '@/lib/types';

interface FormState {
  title: string;
  summary: string;
  description: string;
  category: string;
  required_skills: string[];
  open_roles: string[];
  open_positions: number;
  commitment: string;
  experience_level: string;
  deadline: string;
  collaboration_format: string;
  application_instructions: string;
  status: 'open' | 'closed';
}

const emptyForm: FormState = {
  title: '',
  summary: '',
  description: '',
  category: '',
  required_skills: [],
  open_roles: [],
  open_positions: 2,
  commitment: '',
  experience_level: 'any',
  deadline: '',
  collaboration_format: 'remote-flexible',
  application_instructions: '',
  status: 'open',
};

export function ListingForm({ editId }: { editId?: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notOwner, setNotOwner] = useState(false);

  useEffect(() => {
    if (!editId) return;
    const id = editId;
    let cancelled = false;
    fetchTeamPost(id).then((post) => {
      if (cancelled) return;
      if (post) {
        if (user && post.owner_id !== user.id) {
          setNotOwner(true);
        }
        setForm({
          title: post.title,
          summary: post.summary,
          description: post.description,
          category: post.category,
          required_skills: post.required_skills,
          open_roles: post.open_roles,
          open_positions: post.open_positions,
          commitment: post.commitment,
          experience_level: post.experience_level,
          deadline: post.deadline ?? '',
          collaboration_format: post.collaboration_format,
          application_instructions: post.application_instructions ?? '',
          status: post.status,
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [editId, user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const toggleArrayValue = (key: 'required_skills' | 'open_roles', value: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 5) e.title = 'Give your project a clear title (at least 5 characters).';
    if (form.summary.trim().length < 20) e.summary = 'Write a short summary of at least 20 characters.';
    if (form.description.trim().length < 80) e.description = 'Describe the project in at least 80 characters — goals, problem, expectations.';
    if (!form.category) e.category = 'Pick a category.';
    if (form.required_skills.length === 0) e.required_skills = 'Select at least one skill.';
    if (form.open_roles.length === 0) e.open_roles = 'Select at least one role you are recruiting for.';
    if (!form.commitment) e.commitment = 'Pick an expected weekly commitment.';
    if (form.open_positions < 1 || form.open_positions > 20) e.open_positions = 'Between 1 and 20 positions.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        description: form.description.trim(),
        category: form.category,
        required_skills: form.required_skills,
        open_roles: form.open_roles,
        open_positions: Number(form.open_positions),
        commitment: form.commitment,
        experience_level: form.experience_level as 'beginner' | 'intermediate' | 'advanced' | 'any',
        deadline: form.deadline || null,
        collaboration_format: form.collaboration_format,
        application_instructions: form.application_instructions.trim() || null,
        status: form.status,
      };
      if (editId) {
        await updateTeamPost(editId, payload);
        router.push(`/teams/${editId}`);
        return;
      }
      const id = await createTeamPost(payload);
      router.push(`/teams/${id}`);
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="h-10 w-64 animate-pulse rounded bg-secondary" />
        <div className="mt-8 h-96 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Sign in to post a listing</h1>
        <p className="mt-2 text-muted-foreground">
          You need an account to publish a team listing.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><a href="/login">Sign In</a></Button>
          <Button variant="outline" asChild><a href="/signup">Create Account</a></Button>
        </div>
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-bold">You do not own this listing</h1>
        <p className="mt-2 text-muted-foreground">Only the listing owner can edit it.</p>
        <Button className="mt-6" variant="outline" asChild>
          <a href={editId ? `/teams/${editId}` : '/dashboard'}>Back to listing</a>
        </Button>
      </div>
    );
  }

  const err = (key: string) =>
    errors[key] && <p className="mt-1.5 text-xs font-medium text-destructive">{errors[key]}</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {editId ? 'Edit your listing' : 'Post a team listing'}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {editId
          ? 'Update the details below. Changes are visible immediately.'
          : 'Tell students what you are building and who you need. Clear listings get better applications.'}
      </p>

      {errors.form && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <div className="mt-8 space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="title">Project title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. AI-Powered Study Planner"
            maxLength={100}
          />
          {err('title')}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="summary">Short summary</Label>
          <Input
            id="summary"
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            placeholder="One or two sentences shown on team cards."
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground">{form.summary.length}/160</p>
          {err('summary')}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Full description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={8}
            maxLength={5000}
            placeholder="What are you building? What problem does it solve? What are the goals? How will you work together?"
          />
          {err('description')}
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => set('category', v)}>
            <SelectTrigger aria-label="Category">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {err('category')}
        </div>

        <div className="space-y-1.5">
          <Label>Skills required</Label>
          <TagPicker
            options={[...SKILL_OPTIONS]}
            selected={form.required_skills}
            onToggle={(v) => toggleArrayValue('required_skills', v)}
          />
          {err('required_skills')}
        </div>

        <div className="space-y-1.5">
          <Label>Roles you are recruiting for</Label>
          <TagPicker
            options={[...ROLE_OPTIONS]}
            selected={form.open_roles}
            onToggle={(v) => toggleArrayValue('open_roles', v)}
          />
          {err('open_roles')}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="positions">Open positions</Label>
            <Input
              id="positions"
              type="number"
              min={1}
              max={20}
              value={form.open_positions}
              onChange={(e) => set('open_positions', Number(e.target.value))}
            />
            {err('open_positions')}
          </div>
          <div className="space-y-1.5">
            <Label>Weekly commitment</Label>
            <Select value={form.commitment} onValueChange={(v) => set('commitment', v)}>
              <SelectTrigger aria-label="Commitment">
                <SelectValue placeholder="e.g. 5-8 hrs/week" />
              </SelectTrigger>
              <SelectContent>
                {COMMITMENTS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err('commitment')}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Experience level</Label>
            <Select value={form.experience_level} onValueChange={(v) => set('experience_level', v)}>
              <SelectTrigger aria-label="Experience level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input
              id="deadline"
              type="date"
              value={form.deadline}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => set('deadline', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Collaboration format</Label>
          <Select value={form.collaboration_format} onValueChange={(v) => set('collaboration_format', v)}>
            <SelectTrigger aria-label="Collaboration format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLLAB_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="instructions">Application instructions (optional)</Label>
          <Textarea
            id="instructions"
            value={form.application_instructions}
            onChange={(e) => set('application_instructions', e.target.value)}
            rows={3}
            placeholder="What should applicants include in their intro?"
          />
        </div>

        {editId && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-sm font-semibold">Listing open for applications</p>
              <p className="text-xs text-muted-foreground">
                Close it when all positions are filled.
              </p>
            </div>
            <Switch
              checked={form.status === 'open'}
              onCheckedChange={(checked) => set('status', checked ? 'open' : 'closed')}
              aria-label="Toggle listing open status"
            />
          </div>
        )}

        <Button size="lg" className="w-full" onClick={() => void submit()} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editId ? 'Saving…' : 'Publishing…'}
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {editId ? 'Save changes' : 'Publish listing'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function TagPicker({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-card p-3">
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
                : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
