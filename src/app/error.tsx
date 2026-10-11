"use client";
import { ErrorState } from "../components/ui";
export default function Error({ reset }: { reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
