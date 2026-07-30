const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-pageview`;

export function trackEvent(event: string) {
  fetch(TRACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: `/_cta/${event}`,
      referrer: document.referrer,
      ua: navigator.userAgent,
      host: window.location.hostname,
    }),
  }).catch(() => {});
}
