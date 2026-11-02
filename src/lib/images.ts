import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./env";

const BUCKET = "note-images";
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads one image from the browser (using the logged-in session) and returns a Markdown snippet. */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is over 5 MB.`);

  const supabase = createBrowserClient(supabaseUrl!, supabaseKey!);
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) {
    throw new Error(
      error.message.includes("row-level security")
        ? "Not allowed to upload. Did you run supabase/images.sql?"
        : `Upload failed: ${error.message}`,
    );
  }

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const alt = file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "");
  return `![${alt}](${url})`;
}
