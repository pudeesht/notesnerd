import { notFound, redirect } from "next/navigation";
import { NoteForm } from "@/components/NoteForm";
import { NOTE_COLUMNS, type Note } from "@/lib/notes";
import { createClient } from "@/lib/supabase";

export const metadata = { title: "Edit note" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase.from("notes").select(NOTE_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();

  return <NoteForm note={data as Note} />;
}
