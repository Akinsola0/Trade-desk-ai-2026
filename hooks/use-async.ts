"use client";

import { useCallback, useEffect, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Loads data from a `lib/api` function and keeps the loading and error states
 * every dashboard screen needs. Nothing here knows about mocks or fetch — it
 * just awaits whatever the contract function returns.
 *
 * `load` must be stable: wrap it in `useCallback` at the call site, with the
 * filters it depends on in the dependency array. Changing those re-runs it.
 */
export function useAsync<T>(load: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setState((previous) => ({ ...previous, loading: true }));
      try {
        const data = await load();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          });
        }
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [load, nonce]);

  /** Re-run the loader — used by the retry button in `ErrorState`. */
  const reload = useCallback(() => setNonce((current) => current + 1), []);

  /** Patch the loaded data in place after a mutation, without a round trip. */
  const setData = useCallback((updater: (current: T) => T) => {
    setState((previous) =>
      previous.data === null
        ? previous
        : { ...previous, data: updater(previous.data) },
    );
  }, []);

  return { ...state, reload, setData };
}
