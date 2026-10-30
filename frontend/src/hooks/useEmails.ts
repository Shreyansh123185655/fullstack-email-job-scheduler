import { useCallback, useEffect, useState } from "react";
import { emailService } from "../services/emailService";
import type { Email, EmailStatus } from "../types";

/** Loads one tab's emails with loading + error state and a manual refresh. */
export function useEmails(status: EmailStatus, query: string) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    emailService.list(status, query)
      .then((d) => !cancelled && setEmails(d))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [status, query, tick]);

  return { emails, loading, error, refresh: useCallback(() => setTick((t) => t + 1), []) };
}
