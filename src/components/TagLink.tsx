import Link from "next/link";

export function TagLink({ tag, active, count }: { tag: string; active?: boolean; count?: number }) {
  return (
    <Link
      href={active ? "/" : `/?tag=${encodeURIComponent(tag)}`}
      className={`rounded-full px-2.5 py-0.5 text-xs ${
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      }`}
    >
      #{tag}
      {count !== undefined && <span className="ml-1 opacity-60">{count}</span>}
    </Link>
  );
}
