import { useEffect } from 'react';
import { captureAffiliateFromUrl, getStoredAffiliate } from '@/lib/affiliateTracking';

/**
 * Hook to capture affiliate reference from URL on page load
 * Use in the root component or layout
 */
export function useAffiliateTracking() {
  useEffect(() => {
    // Capture affiliate from URL on mount
    captureAffiliateFromUrl();
  }, []);

  return {
    getAffiliate: getStoredAffiliate,
  };
}
