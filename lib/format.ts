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

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between now and the given date (0 = today), in the viewer's timezone. */
function daysAgo(d: Date): number {
  return Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
}

function parse(date: string | null | undefined): Date | null {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Clock time in the viewer's locale and timezone, e.g. "9:41 AM". */
export function formatTime(date: string | null | undefined): string {
  const d = parse(date);
  return d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
}

/** Divider label inside a chat: Today, Yesterday, a weekday this week, otherwise the full date. */
export function dayLabel(date: string | null | undefined): string {
  const d = parse(date);
  if (!d) return '';
  const n = daysAgo(d);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Short label for the chat list: time if today, Yesterday, a weekday this week, otherwise a date. */
export function listTimeLabel(date: string | null | undefined): string {
  const d = parse(date);
  if (!d) return '';
  const n = daysAgo(d);
  if (n <= 0) return formatTime(date);
  if (n === 1) return 'Yesterday';
  if (n < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}
