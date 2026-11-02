"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseTags } from "@/lib/notes";
import { createClient } from "@/lib/supabase";

export type FormState = { error?: string };

export async function saveNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const row = {
    title,
    tags: parseTags(String(formData.get("tags") ?? "")),
    body: String(formData.get("body") ?? ""),
  };

  if (!title) return { error: "Give it a title." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're logged out. Log in again (your text is still here)." };

  const query = id
    ? supabase.from("notes").update(row).eq("id", id)
    : supabase.from("notes").insert(row);
  const { data, error } = await query.select("id").single();

  if (error) {
    // RLS rejections surface as "no rows" on update or a policy error on insert.
    if (error.code === "PGRST116" || error.code === "42501") {
      return { error: "Not allowed to write. Is your user in the admins table?" };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  redirect(`/notes/${data.id}`);
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
