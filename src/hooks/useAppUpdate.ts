import { useEffect } from "react";
import { toast } from "sonner";

export const useAppUpdate = () => {
  useEffect(() => {
    // Only run in production and in the browser
    if (process.env.NODE_ENV !== "production" || typeof window === "undefined") {
      return;
    }

    const CHECK_INTERVAL = 1000 * 60 * 5; // 5 minutes
    let isChecking = false;

    const checkVersion = async () => {
      if (isChecking) return;
      isChecking = true;

      try {
        // Fetch the version.json with a cache-busting timestamp
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.version;
        const currentVersion = window.__APP_VERSION__;

        if (latestVersion && currentVersion && latestVersion !== currentVersion) {
          console.log(`[VersionCheck] New version available: ${latestVersion} (current: ${currentVersion})`);
          
          // Show a toast or update automatically
          toast.info("Nova versão disponível", {
            description: "A aplicação será atualizada para garantir a melhor experiência.",
            duration: 5000,
          });

          // Delay reload slightly to let the user see the message
          setTimeout(() => {
            // Force reload from server, clearing cache if possible
            window.location.reload();
          }, 2000);
        }
      } catch (error) {
        console.error("[VersionCheck] Failed to check version:", error);
      } finally {
        isChecking = false;
      }
    };

    // Initial check on load
    const timeoutId = setTimeout(checkVersion, 2000);
    
    // Regular interval checks
    const intervalId = setInterval(checkVersion, CHECK_INTERVAL);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);
};
