import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { rehypeSourceOffsets, remarkWikiLinks, type TitleIndex } from "@/lib/wikilinks";

type Props = {
  children: string;
  titles?: TitleIndex;
  /** Editor mode: clickable checkboxes, creatable missing links, source offsets for click-to-edit. */
  editable?: boolean;
};

export function Markdown({ children, titles, editable }: Props) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-code:before:content-none prose-code:after:content-none prose-img:rounded-md prose-img:border prose-img:border-neutral-200 dark:prose-img:border-neutral-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkWikiLinks, { titles, editable }]]}
        rehypePlugins={editable ? [rehypeSourceOffsets, rehypeHighlight] : [rehypeHighlight]}
        components={
          editable
            ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
              { input: ({ node, disabled, ...props }) => <input {...props} readOnly className="cursor-pointer" /> }
            : undefined
        }
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
