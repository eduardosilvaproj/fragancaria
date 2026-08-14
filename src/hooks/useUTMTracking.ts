import { useEffect } from 'react';

/**
 * Hook to capture UTM parameters from URL on page load and store them.
 * Modeled after useAffiliateTracking.
 */
export function useUTMTracking() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const captured: Record<string, string> = {};
    let hasParams = false;

    for (const param of utmParams) {
      const val = urlParams.get(param);
      if (val) {
        captured[param] = val;
        hasParams = true;
      }
    }

    if (hasParams) {
      localStorage.setItem('fragranciaria_utm', JSON.stringify({
        ...captured,
        captured_at: new Date().toISOString()
      }));
    }
  }, []);
}
