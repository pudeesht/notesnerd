"use client";

import { useState, useTransition } from "react";
import { setPinned } from "@/app/actions";

export function PinButton({ id, pinned, className = "" }: { id: string; pinned: boolean; className?: string }) {
  const [on, setOn] = useState(pinned);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await setPinned(id, next);
      if (res.error) {
        setOn(!next);
        alert(res.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={on ? "Unpin" : "Pin to top"}
      aria-label={on ? "Unpin" : "Pin to top"}
      aria-pressed={on}
      className={`rounded p-1 hover:text-neutral-900 disabled:opacity-50 dark:hover:text-neutral-100 ${
        on ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 17v5" />
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      </svg>
    </button>
  );
}
