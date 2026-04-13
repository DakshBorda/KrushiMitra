import { useEffect, useRef, useCallback } from "react";

/**
 * usePolling — Reusable hook for smart polling with Page Visibility API.
 *
 * Features:
 *   - Configurable interval
 *   - Pauses when browser tab is hidden (saves resources)
 *   - Immediate refetch when tab becomes visible again
 *   - Automatic cleanup on unmount
 *
 * @param {Function} callback   — Async function to call on each tick
 * @param {number}   intervalMs — Polling interval in milliseconds
 * @param {boolean}  enabled    — Set to false to pause polling (default: true)
 */
export default function usePolling(callback, intervalMs, enabled = true) {
  const savedCallback = useRef(callback);
  const timerRef = useRef(null);

  // Always keep the latest callback ref
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const tick = useCallback(() => {
    try {
      savedCallback.current();
    } catch (err) {
      // Silent — polling should never crash the app
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Start the interval
    const startInterval = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(tick, intervalMs);
    };

    const stopInterval = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // Visibility change handler — pause when hidden, resume + instant fetch on visible
    const handleVisibility = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        // Immediately refetch when user switches back to this tab
        tick();
        startInterval();
      }
    };

    // Initial start
    startInterval();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs, enabled, tick]);
}
