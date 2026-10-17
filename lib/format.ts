export function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return 'No deadline';
  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  const now = new Date();
  const days = Math.ceil((date.getTime() - now.getTime()) / 86400000);
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  if (days < 0) return `${formatted} (passed)`;
  if (days <= 7) return `${formatted} · ${days}d left`;
  return formatted;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function collaborationLabel(value: string): string {
  const map: Record<string, string> = {
    'remote-flexible': 'Remote · flexible hours',
    'remote-async': 'Remote · async-first',
    hybrid: 'Hybrid',
    'in-person': 'In person',
  };
  return map[value] ?? value;
}

export function experienceLabel(value: string | null | undefined): string {
  if (!value) return 'Any level';
  const map: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    any: 'Any level',
  };
  return map[value] ?? value;
}

/** Only allow http(s) links from user-entered fields, so a "javascript:" URL can never become a clickable link. */
export function safeUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : null;
}
