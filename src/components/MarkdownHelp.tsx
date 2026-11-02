import { Markdown } from "@/components/Markdown";

const ROWS: [string, string][] = [
  ["Heading", "## Approach\n### Smaller heading"],
  ["Bold / italic", "**bold** and *italic*"],
  ["Bullet points", "- first point\n- second point"],
  ["Sub-points (indent 2 spaces, or press Tab)", "- main point\n  - sub-point\n    - sub-sub-point"],
  ["Numbered list", "1. sort the array\n2. two pointers\n   - indent 3 spaces under numbers"],
  ["Inline code", "use `dp[i][j]` here"],
  ["Code block (language after ```)", "```cpp\nint x = 0;\n```"],
  ["Quote / callout", "> watch out for overflow"],
  ["Link", "[LeetCode](https://leetcode.com)"],
  ["Table", "| case | time |\n|---|---|\n| avg | O(n) |"],
  ["Checklist", "- [x] brute force\n- [ ] optimize"],
  ["Divider", "---"],
  ["New paragraph", "leave a blank line\n\nbetween paragraphs"],
];

export function MarkdownHelp() {
  return (
    <div className="mb-3 overflow-x-auto rounded-md border border-neutral-300 text-sm dark:border-neutral-700">
      <table className="w-full">
        <thead className="text-left text-xs text-neutral-500">
          <tr>
            <th className="px-3 py-2 font-medium">What</th>
            <th className="px-3 py-2 font-medium">You type</th>
            <th className="px-3 py-2 font-medium">You get</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 align-top dark:divide-neutral-800">
          {ROWS.map(([label, syntax]) => (
            <tr key={label}>
              <td className="px-3 py-2 text-neutral-500">{label}</td>
              <td className="px-3 py-2">
                <pre className="font-mono text-xs whitespace-pre">{syntax}</pre>
              </td>
              <td className="px-3 py-2 [&_.prose]:text-sm [&_.prose>*]:my-0">
                <Markdown>{syntax}</Markdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
