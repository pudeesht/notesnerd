import type { Element, Root as HastRoot, RootContent as HastContent } from "hast";
import type { Parent, PhrasingContent, Root } from "mdast";

/** [[Target]], [[Target|shown text]], [[Target#heading]] */
const WIKILINK = /\[\[([^[\]\n]+?)\]\]/g;

export type TitleIndex = Record<string, string>; // lowercased title → note id

export const titleKey = (title: string) => title.trim().toLowerCase();

export function parseWikiLink(inner: string) {
  const [target, alias] = inner.split("|");
  const title = target.split("#")[0].trim();
  return { title, label: (alias ?? target).trim() || title };
}

/** Notes should be newest first: on duplicate titles, the most recently edited one wins. */
export function buildTitleIndex(notes: { id: string; title: string }[]): TitleIndex {
  const index: TitleIndex = {};
  for (const n of notes) index[titleKey(n.title)] ??= n.id;
  return index;
}

/** Lowercased titles this body links to (ignoring code). */
export function linkedTitles(body: string): Set<string> {
  const prose = body.replace(/```[\s\S]*?(```|$)/g, "").replace(/`[^`\n]*`/g, "");
  return new Set([...prose.matchAll(WIKILINK)].map((m) => titleKey(parseWikiLink(m[1]).title)));
}

/** Rewrites [[from]] / [[from#x]] / [[from|y]] to point at `to`. */
export function renameLinks(body: string, from: string, to: string): string {
  const escaped = from.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return body.replace(new RegExp(`\\[\\[\\s*${escaped}\\s*((?:#[^\\]|\\n]*)?(?:\\|[^\\]\\n]*)?)\\]\\]`, "gi"), `[[${to}$1]]`);
}

type WikiOptions = { titles?: TitleIndex; editable?: boolean };

/** remark plugin: turns [[links]] in text into links (resolved) or creatable/dimmed stubs (missing). */
export function remarkWikiLinks({ titles = {}, editable = false }: WikiOptions = {}) {
  function toNodes(text: string): PhrasingContent[] | null {
    const out: PhrasingContent[] = [];
    let last = 0;
    for (const m of text.matchAll(WIKILINK)) {
      const { title, label } = parseWikiLink(m[1]);
      if (!title) continue;
      if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
      const id = titles[titleKey(title)];
      if (id) {
        out.push({ type: "link", url: `/notes/${id}`, children: [{ type: "text", value: label }], data: { hProperties: { className: ["wikilink"] } } });
      } else if (editable) {
        out.push({
          type: "link",
          url: "#",
          children: [{ type: "text", value: label }],
          data: { hProperties: { className: ["wikilink", "wikilink-missing"], dataNewTitle: title, title: `Create “${title}”` } },
        });
      } else {
        out.push({ type: "text", value: label, data: { hName: "span", hProperties: { className: ["wikilink", "wikilink-missing"] } } });
      }
      last = m.index + m[0].length;
    }
    if (!out.length) return null;
    if (last < text.length) out.push({ type: "text", value: text.slice(last) });
    return out;
  }

  function walk(node: Parent) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === "text") {
        const nodes = toNodes(child.value);
        if (nodes) {
          node.children.splice(i, 1, ...nodes);
          i += nodes.length - 1;
        }
      } else if ("children" in child && child.type !== "link" && child.type !== "linkReference") {
        walk(child);
      }
    }
  }

  return (tree: Root) => walk(tree);
}

/** rehype plugin: tags elements with their source offset so a click can place the cursor there. */
export function rehypeSourceOffsets() {
  function walk(node: HastRoot | HastContent) {
    if (node.type === "element") {
      const offset = (node as Element).position?.start.offset;
      if (offset !== undefined) node.properties.dataOffset = offset;
    }
    if ("children" in node) node.children.forEach(walk);
  }
  return (tree: HastRoot) => walk(tree);
}

/** Flips the "- [ ]" / "- [x]" of the list item that starts at `offset`. */
export function toggleTask(body: string, offset: number): string {
  const m = /^((?:[-*+]|\d+[.)])[ \t]+\[)([ xX])\]/.exec(body.slice(offset));
  if (!m) return body;
  const at = offset + m[1].length;
  return body.slice(0, at) + (m[2] === " " ? "x" : " ") + body.slice(at + 1);
}
