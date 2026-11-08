export type Note = {
  id: string;
  title: string;
  tags: string[];
  body: string;
  created_at: string;
  updated_at: string;
  pinned_at: string | null;
};

export type NoteSummary = Omit<Note, "body" | "pinned_at"> & { snippet: string };

export const NOTE_COLUMNS = "id, title, tags, body, created_at, updated_at, pinned_at";

/** Most notes that can be pinned at once (also enforced in supabase/pins.sql). */
export const MAX_PINNED = 3;

/** "DP, graphs,  Two Pointers" → ["dp", "graphs", "two-pointers"] */
export function parseTags(raw: string): string[] {
  const tags = raw
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  return [...new Set(tags)];
}

/** Strip the noisiest markdown so list previews read like plain text. */
export function plainSnippet(markdown: string, max = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/[#>*_`~\-\[\]()|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Escapes LIKE wildcards so user text matches literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
