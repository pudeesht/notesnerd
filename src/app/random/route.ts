import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase";

// Jumps to a random note — the cheapest possible way to re-see old problems.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("id");
  const ids = data ?? [];
  const target = ids.length ? `/notes/${ids[Math.floor(Math.random() * ids.length)].id}` : "/";
  return NextResponse.redirect(new URL(target, request.url));
}

export const dynamic = "force-dynamic";
