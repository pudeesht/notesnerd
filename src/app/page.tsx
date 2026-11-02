import Link from "next/link";
import { TagLink } from "@/components/TagLink";
import { formatDate, plainSnippet, type NoteSummary } from "@/lib/notes";
import { createClient } from "@/lib/supabase";

type Search = { q?: string; tag?: string };

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", tag } = await searchParams;

  const supabase = await createClient();
  const [notesRes, tagsRes] = await Promise.all([
    supabase.rpc("search_notes", { q, tag_filter: tag ?? null }),
    supabase.rpc("all_tags"),
  ]);
  const notes = (notesRes.data ?? []) as NoteSummary[];
  const tags = (tagsRes.data ?? []) as { tag: string; count: number }[];
  const filtered = Boolean(q || tag);

  return (
    <div className="space-y-6">
      <form action="/" className="flex gap-2">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search titles, notes, tags…"
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:focus:border-neutral-400"
        />
      </form>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <TagLink key={t.tag} tag={t.tag} count={t.count} active={t.tag === tag} />
          ))}
        </div>
      )}

      {filtered && (
        <p className="text-sm text-neutral-500">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
          {tag && <> tagged #{tag}</>}
          {q && <> matching “{q}”</>} ·{" "}
          <Link href="/" className="underline">
            clear
          </Link>
        </p>
      )}

      {notesRes.error && <p className="text-sm text-red-600">Couldn’t load notes: {notesRes.error.message}</p>}

      {!notesRes.error && notes.length === 0 && (
        <p className="py-12 text-center text-neutral-500">{filtered ? "Nothing matches." : "No notes yet."}</p>
      )}

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {notes.map((n) => (
          <li key={n.id} className="py-4">
            <Link href={`/notes/${n.id}`} className="group block">
              <div className="flex items-baseline gap-2">
                <h2 className="font-semibold group-hover:underline">{n.title}</h2>
                <span className="ml-auto shrink-0 text-xs text-neutral-500">{formatDate(n.updated_at)}</span>
              </div>
              {n.snippet && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{plainSnippet(n.snippet)}</p>}
            </Link>
            {n.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {n.tags.map((t) => (
                  <TagLink key={t} tag={t} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
