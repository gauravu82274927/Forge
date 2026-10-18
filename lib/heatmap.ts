export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: HeatLevel;
}

export interface HeatmapData {
  total: number;
  days: HeatDay[];
  activeDays: number;
  maxStreak: number;
  /** false when per-day counts could only be estimated from the colour level */
  exact: boolean;
}

// ---------------------------------------------------------------------------
// Usernames. These are validated before they ever reach a URL or a query.
// ---------------------------------------------------------------------------

const GITHUB_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const LEETCODE_NAME = /^[A-Za-z0-9_-]{1,40}$/;
const LEETCODE_RESERVED = [
  'problems', 'contest', 'discuss', 'explore', 'studyplan', 'store', 'assessment',
  'interview', 'subscribe', 'premium', 'accounts', 'jobs', 'list', 'tag', 'u',
];

export function isGithubUsername(value: string): boolean {
  return GITHUB_NAME.test(value);
}

export function isLeetcodeUsername(value: string): boolean {
  return LEETCODE_NAME.test(value) && LEETCODE_RESERVED.indexOf(value.toLowerCase()) === -1;
}

/** Accepts a profile link ("https://github.com/you") or a bare username. */
export function parseGithubUsername(input: string | null | undefined): string | null {
  const v = input?.trim();
  if (!v) return null;
  const m = /github\.com\/([A-Za-z0-9-]+)/i.exec(v);
  const name = m ? m[1] : v.replace(/^@/, '');
  return isGithubUsername(name) ? name : null;
}

/** Accepts "https://leetcode.com/u/you", "https://leetcode.com/you" or a bare username. */
export function parseLeetcodeUsername(input: string | null | undefined): string | null {
  const v = input?.trim();
  if (!v) return null;
  const m = /leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]+)/i.exec(v);
  const name = m ? m[1] : v.replace(/^@/, '');
  return isLeetcodeUsername(name) ? name : null;
}

// ---------------------------------------------------------------------------
// Turning raw activity into heatmap data
// ---------------------------------------------------------------------------

function levelFinder(counts: number[]): (count: number) => HeatLevel {
  const nonZero = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (nonZero.length === 0) return () => 0;
  const at = (p: number) => nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))];
  const t1 = at(0.25);
  const t2 = at(0.5);
  const t3 = at(0.75);
  return (c) => (c <= 0 ? 0 : c <= t1 ? 1 : c <= t2 ? 2 : c <= t3 ? 3 : 4);
}

export function finalize(days: HeatDay[], exact: boolean, totalOverride?: number): HeatmapData {
  let total = 0;
  let activeDays = 0;
  let maxStreak = 0;
  let streak = 0;
  days.forEach((d) => {
    total += d.count;
    if (d.count > 0) {
      activeDays += 1;
      streak += 1;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }
  });
  return { total: totalOverride ?? total, days, activeDays, maxStreak, exact };
}

/** LeetCode gives { "<unix seconds at UTC midnight>": submissions }. Build the last 365 days. */
export function buildLeetcodeData(calendar: Record<string, number>, now: Date = new Date()): HeatmapData {
  const byDate: Record<string, number> = {};
  Object.keys(calendar).forEach((key) => {
    const ts = Number(key);
    const count = Number(calendar[key]);
    if (!isFinite(ts) || !isFinite(count)) return;
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    byDate[date] = (byDate[date] || 0) + count;
  });

  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const raw: { date: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date(todayUtc - i * 86400000).toISOString().slice(0, 10);
    raw.push({ date, count: byDate[date] || 0 });
  }
  const levelOf = levelFinder(raw.map((d) => d.count));
  return finalize(
    raw.map((d) => ({ date: d.date, count: d.count, level: levelOf(d.count) })),
    true
  );
}

/** Reads the last-year contribution table from github.com/users/<name>/contributions. */
export function parseGithubContributions(html: string): HeatmapData | null {
  const tips: Record<string, number> = {};
  let hasTips = false;
  const tipRe = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
  let m: RegExpExecArray | null;
  while ((m = tipRe.exec(html)) !== null) {
    const n = /^(\d[\d,]*)\s+contribution/i.exec(m[2].trim());
    tips[m[1]] = n ? parseInt(n[1].replace(/,/g, ''), 10) : 0;
    hasTips = true;
  }

  const days: HeatDay[] = [];
  const cells = html.match(/<td\b[^>]*ContributionCalendar-day[^>]*>/g) || [];
  cells.forEach((tag) => {
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(tag);
    if (!date) return;
    const lvl = /data-level="([0-4])"/.exec(tag);
    const id = /\sid="([^"]+)"/.exec(tag);
    const level = (lvl ? Number(lvl[1]) : 0) as HeatLevel;
    const count = hasTips && id && id[1] in tips ? tips[id[1]] : level;
    days.push({ date: date[1], count, level });
  });
  if (days.length < 30) return null;

  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const headline = /([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i.exec(html);
  return finalize(days, hasTips, headline ? parseInt(headline[1].replace(/,/g, ''), 10) : undefined);
}
