"use client";

import { useActionState, useRef, useState } from "react";
import { saveNote, type FormState } from "@/app/actions";
import { Markdown } from "@/components/Markdown";
import { MarkdownHelp } from "@/components/MarkdownHelp";
import { uploadImage } from "@/lib/images";
import { DSA_TEMPLATE, type Note } from "@/lib/notes";

const input =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:focus:border-neutral-400";

export function NoteForm({ note }: { note?: Note }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveNote, {});
  const [body, setBody] = useState(note?.body ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [showHelp, setShowHelp] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addImages(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    // Remember the cursor now; the user may keep typing while uploads run.
    const at = bodyRef.current?.selectionStart ?? body.length;
    setUploadError("");
    setUploading((n) => n + images.length);
    const results = await Promise.allSettled(images.map(uploadImage));
    setUploading((n) => n - images.length);

    const snippets = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed) setUploadError(failed.reason instanceof Error ? failed.reason.message : String(failed.reason));
    if (snippets.length) {
      const insert = `\n${snippets.join("\n")}\n`;
      setBody((b) => b.slice(0, at) + insert + b.slice(at));
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }}
    >
      {note && <input type="hidden" name="id" value={note.id} />}

      <input
        name="title"
        required
        maxLength={300}
        autoFocus={!note}
        defaultValue={note?.title}
        placeholder="Title, e.g. LC 146 · LRU Cache"
        className={`${input} text-lg font-semibold`}
      />

      <input
        name="tags"
        defaultValue={note?.tags.join(", ")}
        placeholder="Tags, comma separated: dp, graphs"
        className={input}
      />

      <div>
        <div className="mb-2 flex items-center gap-1 text-sm">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 capitalize ${
                tab === t ? "bg-neutral-200 dark:bg-neutral-800" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto" />
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className={`rounded px-3 py-1 ${
              showHelp ? "bg-neutral-200 dark:bg-neutral-800" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Markdown help
          </button>
          {!body.trim() && (
            <button
              type="button"
              onClick={() => setBody(DSA_TEMPLATE)}
              className="rounded px-3 py-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Use DSA template
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded px-3 py-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Add image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            hidden
            onChange={(e) => {
              addImages([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>

        {showHelp && <MarkdownHelp />}

        {/* Kept mounted (just hidden) so the textarea's value is always submitted. */}
        <textarea
          ref={bodyRef}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Tab indents (2 spaces) instead of leaving the box — handy for sub-points.
            if (e.key !== "Tab" || e.shiftKey) return;
            e.preventDefault();
            const ta = e.currentTarget;
            const { selectionStart: s, selectionEnd: end } = ta;
            setBody(body.slice(0, s) + "  " + body.slice(end));
            requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (files.some((f) => f.type.startsWith("image/"))) {
              e.preventDefault();
              addImages(files);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            if (e.dataTransfer.files.length) {
              e.preventDefault();
              addImages([...e.dataTransfer.files]);
            }
          }}
          placeholder="Write in Markdown. ```cpp for code blocks. Paste or drop images."
          className={`${input} min-h-[65vh] resize-y font-mono text-sm leading-relaxed ${tab === "preview" ? "hidden" : ""}`}
        />
        {uploading > 0 && <p className="mt-1 text-xs text-neutral-500">Uploading {uploading} image(s)…</p>}
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        {tab === "preview" && (
          <div className="min-h-[65vh] rounded-md border border-neutral-300 px-4 py-3 dark:border-neutral-700">
            {body.trim() ? <Markdown>{body}</Markdown> : <p className="text-neutral-500">Nothing to preview.</p>}
          </div>
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading > 0}
          className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <span className="text-xs text-neutral-500">Ctrl/⌘ + Enter</span>
      </div>
    </form>
  );
}
