import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewProps {
  content: string;
}

function isSafeHref(href?: string): boolean {
  if (!href) return false;
  return /^https:\/\//i.test(href.trim());
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  if (!content.trim()) {
    return (
      <p className="text-sm text-slate-400 italic">
        Bài học này chưa có nội dung văn bản.
      </p>
    );
  }

  return (
    <div className="text-slate-200 text-sm sm:text-[15px] leading-relaxed space-y-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white border-b border-slate-800 pb-2 mt-6 mb-3">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-amber-400 mt-6 mb-2.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-cyan-300 mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => <p className="text-slate-200 leading-7">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-1.5 text-slate-200">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-1.5 text-slate-200">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="rounded-xl bg-slate-900/80 border border-slate-700/70 px-4 py-3 text-slate-300 text-sm">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="block bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-cyan-300 overflow-x-auto">
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-xs">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="overflow-x-auto my-3">{children}</pre>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-900 text-cyan-300 font-mono text-xs uppercase border-b border-slate-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-800 bg-slate-950/50">{children}</tbody>
          ),
          th: ({ children }) => <th className="px-3.5 py-2.5 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3.5 py-2.5 text-slate-300">{children}</td>,
          a: ({ href, children }) =>
            isSafeHref(href) ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline underline-offset-4 hover:text-cyan-300"
              >
                {children}
              </a>
            ) : (
              <span className="text-slate-400">{children}</span>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
