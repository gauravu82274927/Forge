'use client';

import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import type { HeatDay, HeatLevel } from '@/lib/heatmap';

const COLORS: Record<HeatLevel, string> = {
  0: '#3a3a3a',
  1: '#27613a',
  2: '#2f8f4a',
  3: '#3fbf5f',
  4: '#9be9a8',
};
const CELL = 10;
const GAP = 3;
const STEP = CELL + GAP;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

interface HeatmapProps {
  platform: string;
  username: string;
  profileUrl: string;
  /** e.g. "submissions in the past one year" */
  headline: string;
  total: number;
  unit: string;
  days: HeatDay[];
  activeDays: number;
  maxStreak: number;
  exact: boolean;
}

export function Heatmap({
  platform,
  username,
  profileUrl,
  headline,
  total,
  unit,
  days,
  activeDays,
  maxStreak,
  exact,
}: HeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Columns are weeks (Sunday on top), so pad the first week up to its weekday.
  const first = days.length ? parseDate(days[0].date).getUTCDay() : 0;
  const cells: (HeatDay | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  days.forEach((d) => cells.push(d));
  const weeks: (HeatDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const monthOfWeek = (w: (HeatDay | null)[]): number => {
    const day = w.find((c) => c !== null);
    return day ? parseDate(day.date).getUTCMonth() : -1;
  };
  const labels: { col: number; text: string }[] = [];
  weeks.forEach((w, i) => {
    const month = monthOfWeek(w);
    if (month < 0) return;
    const show =
      i === 0
        ? weeks.length > 1 && monthOfWeek(weeks[1]) === month
        : month !== monthOfWeek(weeks[i - 1]);
    if (show) labels.push({ col: i, text: MONTHS[month] });
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days]);

  const width = weeks.length * STEP;

  return (
    <div className="rounded-xl bg-[#262626] p-4 text-white sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-lg leading-tight sm:text-xl">
            <span className="font-bold">{total.toLocaleString()}</span>{' '}
            <span className="text-white/80">{headline}</span>
          </p>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80"
          >
            {platform} · {username}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="text-xs text-white/60">
          Total active days: <span className="font-semibold text-white">{activeDays}</span>
          <span className="ml-4">
            Max streak: <span className="font-semibold text-white">{maxStreak}</span>
          </span>
        </p>
      </div>

      <div ref={scrollRef} className="mt-4 overflow-x-auto pb-1">
        <div style={{ width: width + 8 }}>
          <div
            role="img"
            aria-label={`${platform} activity: ${total} ${unit} in the past year`}
            style={{
              display: 'grid',
              gridAutoFlow: 'column',
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gridAutoColumns: `${CELL}px`,
              gap: GAP,
            }}
          >
            {weeks.map((w, wi) =>
              [0, 1, 2, 3, 4, 5, 6].map((di) => {
                const c = w[di] ?? null;
                if (!c) return <span key={`${wi}-${di}`} style={{ width: CELL, height: CELL }} />;
                const when = parseDate(c.date).toLocaleDateString([], {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
                });
                return (
                  <span
                    key={c.date}
                    title={exact ? `${c.count} ${unit} on ${when}` : `Activity on ${when}`}
                    style={{ width: CELL, height: CELL, borderRadius: 2, background: COLORS[c.level] }}
                  />
                );
              })
            )}
          </div>

          <div className="relative mt-2 h-4 text-[11px] text-white/50" style={{ width }}>
            {labels.map((l) => (
              <span key={l.col} className="absolute" style={{ left: l.col * STEP }}>
                {l.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-white/50">
        Less
        {([0, 1, 2, 3, 4] as HeatLevel[]).map((l) => (
          <span key={l} style={{ width: CELL, height: CELL, borderRadius: 2, background: COLORS[l] }} />
        ))}
        More
      </div>
    </div>
  );
}
