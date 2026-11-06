"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createNote, renameLinksTo, saveNote, type NoteFields } from "@/app/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { Markdown } from "@/components/Markdown";
import { MarkdownHelp } from "@/components/MarkdownHelp";
import { caretCoords } from "@/lib/caret";
import { uploadImage } from "@/lib/images";
import { formatDate, type Note } from "@/lib/notes";
import { buildTitleIndex, titleKey, toggleTask } from "@/lib/wikilinks";

type Props = {
  note: Note;
  /** Every note's id + title, newest first: resolves [[links]] and feeds autocomplete. */
  allNotes: { id: string; title: string }[];
  /** Just created: jump straight into typing. */
  startEditing?: boolean;
};

type Suggest = { start: number; query: string; index: number; top: number; left: number };

const AUTOSAVE_MS = 800;
const UNTITLED = "Untitled";
const toolButton = "rounded px-2 py-0.5 hover:text-neutral-900 dark:hover:text-neutral-100";
const same = (a: NoteFields, b: NoteFields) => a.title === b.title && a.tags === b.tags && a.body === b.body;

export function NoteEditor({ note, allNotes, startEditing }: Props) {
  const initial = useMemo(() => ({ title: note.title, tags: note.tags.join(", "), body: note.body }), [note]);
  const [title, setTitle] = useState(initial.title);
  const [tags, setTags] = useState(initial.tags);
  const [body, setBody] = useState(initial.body);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(note.updated_at);

  const focusTitle = startEditing && note.title === UNTITLED;
  const [editing, setEditing] = useState(Boolean(startEditing) && !focusTitle);
  const [showHelp, setShowHelp] = useState(false);
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<{ offset: number; y?: number } | null>(editing ? { offset: note.body.length } : null);
  const titleAtFocus = useRef(note.title);

  const titles = useMemo(() => buildTitleIndex(allNotes), [allNotes]);
  const fields = useMemo(() => ({ title, tags, body }), [title, tags, body]);
  const dirty = !same(fields, saved);

  // ─── Autosave ──────────────────────────────────────────────────────────────
  const latest = useRef(fields);
  const savedRef = useRef(saved);
  const inFlight = useRef(false);
  const again = useRef(false);
  useEffect(() => {
    latest.current = fields;
  }, [fields]);

  const flush = useCallback(async () => {
    if (inFlight.current) {
      again.current = true; // picked up by the loop below once the current save lands
      return;
    }
    inFlight.current = true;
    try {
      do {
        again.current = false;
        const f = latest.current;
        if (same(f, savedRef.current)) break;
        if (!f.title.trim()) {
          setError("Give it a title to save.");
          break;
        }
        setSaving(true);
        const res = await saveNote(note.id, f).catch((e: unknown) => ({
          error: e instanceof Error ? e.message : String(e),
          updatedAt: undefined,
        }));
        if (res.error) {
          setError(res.error);
          break;
        }
        setError("");
        savedRef.current = f;
        setSaved(f);
        if (res.updatedAt) setUpdatedAt(res.updatedAt);
      } while (again.current);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [note.id]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(flush, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [fields, dirty, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!same(latest.current, savedRef.current)) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      flush(); // navigating away inside the app (e.g. clicking a [[link]])
    };
  }, [flush]);

  // ─── Switching between reading and typing ─────────────────────────────────
  function editAt(offset: number, y?: number) {
    pendingCaret.current = { offset, y };
    setEditing(true);
  }

  function finishEditing() {
    setEditing(false);
    setSuggest(null);
    flush();
  }

  useEffect(() => {
    if (focusTitle) titleRef.current?.select();
  }, [focusTitle]);

  // Grow the textarea to fit, so the page scrolls instead of the box.
  useLayoutEffect(() => {
    const ta = bodyRef.current;
    if (!ta || !editing) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [body, editing]);

  // Put the cursor where the reader clicked, and keep that line under the mouse.
  useLayoutEffect(() => {
    const ta = bodyRef.current;
    const p = pendingCaret.current;
    if (!editing || !ta || !p) return;
    pendingCaret.current = null;
    ta.focus({ preventScroll: p.y !== undefined });
    ta.setSelectionRange(p.offset, p.offset);
    if (p.y !== undefined) window.scrollBy(0, ta.getBoundingClientRect().top + caretCoords(ta, p.offset).top - p.y);
  }, [editing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        flush();
      } else if (key === "e") {
        e.preventDefault();
        if (editing) finishEditing();
        else editAt(bodyRef.current?.selectionStart ?? body.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onReadClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      e.preventDefault();
      const item = target.closest<HTMLElement>("li[data-offset]");
      if (item) setBody((b) => toggleTask(b, Number(item.dataset.offset)));
      return;
    }
    const link = target.closest("a");
    if (link) {
      const newTitle = link.dataset.newTitle;
      if (newTitle) {
        e.preventDefault();
        const form = new FormData();
        form.set("title", newTitle);
        startTransition(async () => {
          await flush();
          await createNote(form);
        });
      }
      return; // real links just navigate
    }
    if (window.getSelection()?.toString()) return; // selecting text to copy, not to edit
    const block = target.closest<HTMLElement>("[data-offset]");
    editAt(block ? Number(block.dataset.offset) : body.length, e.clientY);
  }

  // ─── [[link]] autocomplete ─────────────────────────────────────────────────
  const matches = useMemo(() => {
    if (!suggest) return [];
    const q = suggest.query.trim().toLowerCase();
    return allNotes
      .filter((n) => n.id !== note.id && n.title.toLowerCase().includes(q))
      .sort((a, b) => a.title.toLowerCase().indexOf(q) - b.title.toLowerCase().indexOf(q))
      .slice(0, 8);
  }, [suggest, allNotes, note.id]);
  const active = suggest ? Math.min(suggest.index, matches.length - 1) : -1;

  function updateSuggest(ta: HTMLTextAreaElement) {
    const pos = ta.selectionStart;
    const m = pos === ta.selectionEnd ? /\[\[([^[\]\n|#]*)$/.exec(ta.value.slice(0, pos)) : null;
    if (!m) return setSuggest(null);
    const start = pos - m[1].length;
    setSuggest((prev) => {
      if (prev && prev.start === start && prev.query === m[1]) return prev;
      const c = caretCoords(ta, pos);
      return { start, query: m[1], index: 0, top: c.top + c.height, left: c.left };
    });
  }

  function acceptSuggestion(linkTitle: string) {
    const ta = bodyRef.current;
    if (!ta || !suggest) return;
    const end = ta.selectionStart;
    const rest = body.slice(body.startsWith("]]", end) ? end + 2 : end);
    setBody(body.slice(0, suggest.start) + linkTitle + "]]" + rest);
    setSuggest(null);
    const caret = suggest.start + linkTitle.length + 2;
    requestAnimationFrame(() => ta.setSelectionRange(caret, caret));
  }

  function onBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggest && matches.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setSuggest({ ...suggest, index: (active + step + matches.length) % matches.length });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        acceptSuggestion(matches[active].title);
        return;
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (suggest) setSuggest(null);
      else finishEditing();
      return;
    }
    // Tab indents (2 spaces) instead of leaving the box — handy for sub-points.
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = ta;
      setBody(body.slice(0, s) + "  " + body.slice(end));
      requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
    }
  }

  // ─── Images ────────────────────────────────────────────────────────────────
  async function addImages(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    // Remember the cursor now; the user may keep typing while uploads run.
    const at = editing ? (bodyRef.current?.selectionStart ?? body.length) : body.length;
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

  // ─── Render ────────────────────────────────────────────────────────────────
  const status = error ? (
    <span className="text-red-600">{error}</span>
  ) : saving ? (
    <span>Saving…</span>
  ) : dirty ? (
    <span>Unsaved</span>
  ) : (
    <span>Updated {formatDate(updatedAt)}</span>
  );

  return (
    <article className="space-y-4">
      <header className="space-y-2">
        <input
          ref={titleRef}
          value={title}
          maxLength={300}
          autoFocus={focusTitle}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => (titleAtFocus.current = title)}
          onBlur={() => {
            const from = titleAtFocus.current;
            if (title.trim() && titleKey(from) !== titleKey(title)) {
              flush().then(() => renameLinksTo(from, title));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editAt(0);
            }
          }}
          placeholder="Title"
          className="-mx-1 w-full rounded bg-transparent px-1 text-2xl font-bold tracking-tight outline-none hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
        />
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-neutral-500">
          {status}
          {/* mousedown preventDefault keeps focus (and edit mode) in the text while using these. */}
          <span className="ml-auto flex items-center gap-1" onMouseDown={(e) => e.preventDefault()}>
            <button type="button" onClick={() => setShowHelp((v) => !v)} className={`${toolButton} ${showHelp ? "bg-neutral-200 dark:bg-neutral-800" : ""}`}>
              Markdown help
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className={toolButton}>
              Add image
            </button>
            <span className="px-2">
              <DeleteButton id={note.id} />
            </span>
          </span>
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
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Add tags, comma separated"
          className="-mx-1 w-full rounded bg-transparent px-1 text-sm outline-none placeholder:text-neutral-400 hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
        />
      </header>

      {showHelp && <MarkdownHelp />}

      <div
        onBlur={(e) => {
          // Clicking elsewhere on the page finishes editing; switching windows (or the file picker) doesn't.
          if (!editing || e.currentTarget.contains(e.relatedTarget) || !document.hasFocus()) return;
          finishEditing();
        }}
      >
        <div className="relative">
          {/* Kept mounted (just hidden) so the cursor position survives switching back and forth. */}
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              updateSuggest(e.target);
            }}
            onSelect={(e) => updateSuggest(e.currentTarget)}
            onKeyDown={onBodyKeyDown}
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
            placeholder="Write in Markdown. [[ links a note. Paste or drop images."
            className={`block min-h-[50vh] w-full resize-none overflow-hidden rounded-md border border-neutral-300 bg-transparent px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-neutral-500 dark:border-neutral-700 dark:focus:border-neutral-400 ${editing ? "" : "hidden"}`}
          />
          {editing && suggest && matches.length > 0 && (
            <ul
              style={{ top: suggest.top + 4, left: `min(${suggest.left}px, calc(100% - 16rem))` }}
              className="absolute z-10 w-64 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
            >
              {matches.map((n, i) => (
                <li
                  key={n.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    acceptSuggestion(n.title);
                  }}
                  className={`cursor-pointer truncate px-3 py-1.5 ${i === active ? "bg-neutral-100 dark:bg-neutral-800" : ""}`}
                >
                  {n.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!editing && (
          <div
            onClick={onReadClick}
            className="min-h-[50vh] cursor-text rounded-md border border-transparent px-3 py-2 hover:border-neutral-200 dark:hover:border-neutral-800"
          >
            {body.trim() ? (
              <Markdown titles={titles} editable>
                {body}
              </Markdown>
            ) : (
              <p className="text-neutral-500">Click to start writing…</p>
            )}
          </div>
        )}

        <p className="mt-1 text-xs text-neutral-500">
          {uploading > 0 && <>Uploading {uploading} image(s)… </>}
          {uploadError && <span className="text-red-600">{uploadError} </span>}
          {editing ? "Esc or click outside to finish · type [[ to link a note" : "Click the text to edit · Ctrl/⌘+E"}
        </p>
      </div>
    </article>
  );
}
