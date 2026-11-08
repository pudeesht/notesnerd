import Link from "next/link";
import { PinButton } from "@/components/PinButton";
import { TagLink } from "@/components/TagLink";
import { formatDate, MAX_PINNED, plainSnippet, type NoteSummary } from "@/lib/notes";
import { createClient, getUser } from "@/lib/supabase";

type Search = { q?: string; tag?: string };

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", tag } = await searchParams;

  const supabase = await createClient();
  const [notesRes, tagsRes, pinnedRes, user] = await Promise.all([
    supabase.rpc("search_notes", { q, tag_filter: tag ?? null }),
    supabase.rpc("all_tags"),
    supabase
      .from("notes")
      .select("id, title, tags, body, created_at, updated_at")
      .not("pinned_at", "is", null)
      .order("pinned_at", { ascending: true }),
    getUser(),
  ]);
  const notes = (notesRes.data ?? []) as NoteSummary[];
  const tags = (tagsRes.data ?? []) as { tag: string; count: number }[];
  const pinned: NoteSummary[] = (pinnedRes.data ?? []).map(({ body, ...n }) => ({ ...n, snippet: body.slice(0, 300) }));
  const pinnedIds = new Set(pinned.map((n) => n.id));
  const filtered = Boolean(q || tag);
  // Unfiltered: pinned notes sit in their own section, so leave them out of the main list.
  const rest = filtered ? notes : notes.filter((n) => !pinnedIds.has(n.id));

  const row = (n: NoteSummary) => (
    <li key={n.id} className="py-4">
      <div className="flex items-start gap-1">
        <Link href={`/notes/${n.id}`} className="group block min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="font-semibold group-hover:underline">{n.title}</h2>
            <span className="ml-auto shrink-0 text-xs text-neutral-500">{formatDate(n.updated_at)}</span>
          </div>
          {n.snippet && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{plainSnippet(n.snippet)}</p>}
        </Link>
        {user && <PinButton key={`${n.id}-${pinnedIds.has(n.id)}`} id={n.id} pinned={pinnedIds.has(n.id)} className="-mt-0.5 shrink-0" />}
      </div>
      {n.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {n.tags.map((t) => (
            <TagLink key={t} tag={t} />
          ))}
        </div>
      )}
    </li>
  );

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

      {!filtered && pinned.length > 0 && (
        <section className="rounded-lg border border-neutral-200 px-4 dark:border-neutral-800">
          <h2 className="pt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Pinned{user && <> · {pinned.length}/{MAX_PINNED}</>}
          </h2>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">{pinned.map(row)}</ul>
        </section>
      )}

      {!notesRes.error && notes.length === 0 && (
        <p className="py-12 text-center text-neutral-500">{filtered ? "Nothing matches." : "No notes yet."}</p>
      )}

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">{rest.map(row)}</ul>
    </div>
  );
}
