import posthog from 'posthog-js';

/**
 * PostHog analytics for Forge.
 *
 * Privacy choices, on purpose:
 * - Autocapture, session recording, heatmaps and dead-click capture are OFF. Autocapture
 *   records the text of whatever was clicked, which here can be a person's name or a chat
 *   preview, and session replay would record chats.
 * - We send page views plus a short list of named events (see AnalyticsEvent) that never
 *   carry message text, search text or assistant questions.
 * - Everything after "?" or "#" in a URL is removed before sending. Password-reset and
 *   email-confirmation links put secret tokens there.
 * - People are identified by their internal account id only, never by name or email.
 * - Browsers that send Do Not Track are respected.
 * - With no NEXT_PUBLIC_POSTHOG_KEY set, nothing is loaded and nothing is sent.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/+$/, '');

// Requests go through our own /ingest path (see next.config.js) so ad blockers do not drop them.
const PROXY_PATH = '/ingest';
// Where "view in PostHog" links point, e.g. https://us.i.posthog.com -> https://us.posthog.com
const UI_HOST = HOST.replace('.i.posthog.com', '.posthog.com');

export type AnalyticsEvent =
  | 'sign_up'
  | 'login'
  | 'password_reset_requested'
  | 'profile_saved'
  | 'listing_created'
  | 'application_submitted'
  | 'application_withdrawn'
  | 'application_accepted'
  | 'application_declined'
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'message_sent'
  | 'search_opened'
  | 'search_performed'
  | 'assistant_opened'
  | 'assistant_question'
  | 'complaint_filed';

type EventProps = Record<string, string | number | boolean | null>;

let started = false;

/** Cut a URL at the first "?" or "#" so queries and fragments never leave the browser. */
export function stripUrlExtras(value: string): string {
  const cut = value.search(/[?#]/);
  return cut === -1 ? value : value.slice(0, cut);
}

function scrubProps<T extends Record<string, unknown> | undefined>(props: T): T {
  if (!props) return props;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
      (props as Record<string, unknown>)[k] = stripUrlExtras(v);
    }
  }
  return props;
}

export function initAnalytics(): void {
  if (started || typeof window === 'undefined' || !KEY) return;
  started = true;
  posthog.init(KEY, {
    api_host: PROXY_PATH,
    ui_host: UI_HOST,
    person_profiles: 'identified_only',
    // Single-page navigations in the App Router change the URL without a reload.
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_capture_url_hashes: true,
    respect_dnt: true,
    before_send: (event) => {
      if (!event) return null;
      scrubProps(event.properties);
      scrubProps(event.$set);
      scrubProps(event.$set_once);
      return event;
    },
  });
}

/** Record a named event. Safe to call anywhere: does nothing if analytics is off. */
export function track(event: AnalyticsEvent, props?: EventProps): void {
  if (!started) return;
  try {
    posthog.capture(event, props);
  } catch {
    // Analytics must never break the app.
  }
}

/** Link this browser's events to the signed-in account (id only, no name or email). */
export function identifyUser(userId: string): void {
  if (!started) return;
  try {
    if (posthog.get_distinct_id() !== userId) posthog.identify(userId);
  } catch {
    // ignore
  }
}

/** Call on sign-out so the next person on this browser is not linked to the old account. */
export function resetAnalytics(): void {
  if (!started) return;
  try {
    posthog.reset();
  } catch {
    // ignore
  }
}
