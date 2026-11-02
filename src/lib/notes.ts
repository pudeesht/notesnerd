export type Note = {
  id: string;
  title: string;
  tags: string[];
  body: string;
  created_at: string;
  updated_at: string;
};

export type NoteSummary = Omit<Note, "body"> & { snippet: string };

export const NOTE_COLUMNS = "id, title, tags, body, created_at, updated_at";

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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
