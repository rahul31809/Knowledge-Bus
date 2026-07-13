"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { addEntityLinks } from "@/lib/entity-links";

export function Markdown({
  children,
  enableEntityLinks = false,
}: {
  children: string;
  enableEntityLinks?: boolean;
}) {
  const content = enableEntityLinks ? addEntityLinks(children) : children;

  return (
    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {linkChildren}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
