"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { escapeLike, parseTags } from "@/lib/notes";
import { createClient } from "@/lib/supabase";
import { renameLinks, titleKey } from "@/lib/wikilinks";

export type FormState = { error?: string };

export type NoteFields = { title: string; tags: string; body: string };
export type SaveResult = { error?: string; updatedAt?: string };

const NOT_ALLOWED = "Not allowed to write. Is your user in the admins table?";

/** Autosave from the editor: no redirect, just reports back. */
export async function saveNote(id: string, fields: NoteFields): Promise<SaveResult> {
  const title = fields.title.trim();
  if (!title) return { error: "Give it a title to save." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're logged out. Log in again in another tab (your text is still here)." };

  const { data, error } = await supabase
    .from("notes")
    .update({ title, tags: parseTags(fields.tags), body: fields.body })
    .eq("id", id)
    .select("updated_at")
    .single();

  if (error) {
    // RLS rejections surface as "no rows" on update.
    return { error: error.code === "PGRST116" || error.code === "42501" ? NOT_ALLOWED : error.message };
  }
  revalidatePath("/");
  return { updatedAt: data.updated_at };
}

/** Creates a note (optionally pre-titled, e.g. from a [[missing link]]) and opens it for editing. */
export async function createNote(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim().slice(0, 300) || "Untitled";
  const { data, error } = await supabase.from("notes").insert({ title }).select("id").single();
  if (error) throw new Error(error.code === "42501" ? NOT_ALLOWED : error.message);

  revalidatePath("/");
  redirect(`/notes/${data.id}?edit=1`);
}

/** After a rename, points every [[old title]] link at the new title. */
export async function renameLinksTo(from: string, to: string): Promise<void> {
  from = from.trim();
  to = to.trim();
  if (!from || !to || titleKey(from) === titleKey(to)) return;

  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("id, body").ilike("body", `%[[%${escapeLike(from)}%`);
  await Promise.all(
    (data ?? []).flatMap((n) => {
      const body = renameLinks(n.body, from, to);
      return body === n.body ? [] : [supabase.from("notes").update({ body }).eq("id", n.id)];
    }),
  );
  revalidatePath("/");
}

export async function deleteNote(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("notes").delete().eq("id", String(formData.get("id")));
  revalidatePath("/");
  redirect("/");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
