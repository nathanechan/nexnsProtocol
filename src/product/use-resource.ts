"use client";
import { useEffect, useState } from "react";
export function useResource<T>(load: () => Promise<T>, initialData?: T) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: boolean;
  }>({ data: initialData ?? null, loading: initialData == null, error: false });
  useEffect(() => {
    let active = true;
    setState((previous) => ({
      ...previous,
      loading: previous.data == null,
      error: false,
    }));
    load().then(
      (data) => {
        if (active) setState({ data, loading: false, error: false });
      },
      () => {
        if (active) setState({ data: null, loading: false, error: true });
      },
    );
    return () => {
      active = false;
    };
  }, [load, retry]);
  return { ...state, retry: () => setRetry((n) => n + 1) };
}
