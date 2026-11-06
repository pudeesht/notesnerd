import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Markdown } from "@/components/Markdown";
import { NoteEditor } from "@/components/NoteEditor";
import { TagLink } from "@/components/TagLink";
import { escapeLike, formatDate, NOTE_COLUMNS, type Note } from "@/lib/notes";
import { createClient, getUser } from "@/lib/supabase";
import { buildTitleIndex, linkedTitles, titleKey } from "@/lib/wikilinks";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> };

const getNote = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle();
  return data as Note | null;
});

async function getAllTitles() {
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("id, title").order("updated_at", { ascending: false });
  return data ?? [];
}

/** Notes whose body contains a [[link]] to this note's title. */
async function getBacklinks(note: Note) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, title, body")
    .ilike("body", `%[[%${escapeLike(note.title.trim())}%`)
    .neq("id", note.id)
    .order("updated_at", { ascending: false });
  const key = titleKey(note.title);
  return (data ?? []).filter((n) => linkedTitles(n.body).has(key));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const note = await getNote((await params).id);
  return { title: note?.title ?? "Not found" };
}

export default async function NotePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { edit } = await searchParams;
  const [note, user, allNotes] = await Promise.all([getNote(id), getUser(), getAllTitles()]);
  if (!note) notFound();
  const backlinks = await getBacklinks(note);

  return (
    <>
      {user ? (
        <NoteEditor key={note.id} note={note} allNotes={allNotes} startEditing={edit === "1"} />
      ) : (
        <article className="space-y-6">
          <header className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight">{note.title}</h1>
            <p className="text-sm text-neutral-500">Updated {formatDate(note.updated_at)}</p>
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((t) => (
                  <TagLink key={t} tag={t} />
                ))}
              </div>
            )}
          </header>
          {note.body.trim() ? (
            <Markdown titles={buildTitleIndex(allNotes)}>{note.body}</Markdown>
          ) : (
            <p className="text-neutral-500">No body.</p>
          )}
        </article>
      )}

      {backlinks.length > 0 && (
        <section className="mt-12 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="mb-2 text-sm font-medium text-neutral-500">Linked from</h2>
          <ul className="space-y-1">
            {backlinks.map((n) => (
              <li key={n.id}>
                <Link href={`/notes/${n.id}`} className="hover:underline">
                  {n.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
