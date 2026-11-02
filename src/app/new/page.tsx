import { redirect } from "next/navigation";
import { NoteForm } from "@/components/NoteForm";
import { getUser } from "@/lib/supabase";

export const metadata = { title: "New note" };

export default async function NewPage() {
  if (!(await getUser())) redirect("/login");
  return <NoteForm />;
}
