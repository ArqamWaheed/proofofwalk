import { useCallback, useEffect, useRef, useState } from "react";
import type { Fix } from "./trace";
import { toFix } from "./trace";

export type WalkState = "idle" | "recording" | "finished";

export function useWalk() {
  const [state, setState] = useState<WalkState>("idle");
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  // A walk that keeps recording after the component unmounts is a battery leak
  // and a privacy problem.
  useEffect(() => stopWatching, [stopWatching]);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("This browser has no Geolocation API.");
      return;
    }
    setError(null);
    setFixes([]);
    setSimulated(false);
    setState("recording");

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => setFixes((prev) => [...prev, toFix(pos)]),
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — you can still run a simulated walk."
            : `Location error: ${err.message}`,
        );
        stopWatching();
        setState("idle");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
  }, [stopWatching]);

  const finish = useCallback(() => {
    stopWatching();
    setState("finished");
  }, [stopWatching]);

  const runSimulated = useCallback((simFixes: Fix[]) => {
    stopWatching();
    setError(null);
    setFixes(simFixes);
    setSimulated(true);
    setState("finished");
  }, [stopWatching]);

  const reset = useCallback(() => {
    stopWatching();
    setFixes([]);
    setSimulated(false);
    setError(null);
    setState("idle");
  }, [stopWatching]);

  return { state, fixes, simulated, error, start, finish, runSimulated, reset };
}
