import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-pageview`;

export function usePageTracking() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;

    fetch(TRACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: location.pathname,
        referrer: document.referrer,
        ua: navigator.userAgent,
        host: window.location.hostname,
      }),
    }).catch(() => {});
  }, [location.pathname]);
}
