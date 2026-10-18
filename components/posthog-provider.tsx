'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

/** Starts PostHog once in the browser. All the settings live in lib/analytics.ts. */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);
  return <>{children}</>;
}
