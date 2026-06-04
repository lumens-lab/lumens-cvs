import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

// Publishable client-side keys — safe to hardcode (DSN/project key are public).
const SENTRY_DSN =
  'https://c6d616cdf6c9da7392fa4d277282b9af@o4511504996827136.ingest.de.sentry.io/4511505038901328';
const POSTHOG_KEY = 'phc_kmUKvL2pSbKm4PmtrjWZhd7oe4PyxjKr676fcJiijmTh';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

let initialized = false;

export function initObservability() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  } catch (e) {
    console.warn('[obs] Sentry init failed', e);
  }
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      person_profiles: 'identified_only',
    });
  } catch (e) {
    console.warn('[obs] PostHog init failed', e);
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try { Sentry.setUser({ id: userId }); } catch {}
  try { posthog.identify(userId, traits); } catch {}
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try { posthog.capture(name, props); } catch {}
}

export { Sentry, posthog };