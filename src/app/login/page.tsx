"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/actions";

const input =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:focus:border-neutral-400";

export default function LoginPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={action} className="mx-auto mt-12 max-w-sm space-y-3">
      <h1 className="text-xl font-bold">Log in</h1>
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className={input} />
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        className={input}
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
