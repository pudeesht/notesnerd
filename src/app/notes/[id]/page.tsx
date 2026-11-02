import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DeleteButton } from "@/components/DeleteButton";
import { Markdown } from "@/components/Markdown";
import { TagLink } from "@/components/TagLink";
import { formatDate, NOTE_COLUMNS, type Note } from "@/lib/notes";
import { createClient, getUser } from "@/lib/supabase";

type Props = { params: Promise<{ id: string }> };

const getNote = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle();
  return data as Note | null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const note = await getNote((await params).id);
  return { title: note?.title ?? "Not found" };
}

export default async function NotePage({ params }: Props) {
  const { id } = await params;
  const [note, user] = await Promise.all([getNote(id), getUser()]);
  if (!note) notFound();

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{note.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
          <span>Updated {formatDate(note.updated_at)}</span>
          {user && (
            <span className="ml-auto flex gap-4">
              <Link href={`/notes/${note.id}/edit`} className="hover:underline">
                Edit
              </Link>
              <DeleteButton id={note.id} />
            </span>
          )}
        </div>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map((t) => (
              <TagLink key={t} tag={t} />
            ))}
          </div>
        )}
      </header>

      {note.body.trim() ? <Markdown>{note.body}</Markdown> : <p className="text-neutral-500">No body.</p>}
    </article>
  );
}
