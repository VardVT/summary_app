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
    <div className="text-slate-700 text-sm sm:text-[15px] leading-relaxed space-y-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2.5 mt-6 mb-3">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-slate-900 mt-6 mb-2.5 flex items-center gap-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-[#0284C7] mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => <p className="text-slate-700 leading-7">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-1.5 text-slate-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-1.5 text-slate-700">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="rounded-2xl bg-sky-50/70 border border-sky-200/80 px-4 py-3 text-slate-700 text-sm">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="block bg-[#0F172A] border border-slate-800 rounded-2xl p-4 font-mono text-xs text-sky-300 overflow-x-auto leading-relaxed">
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-200/70 text-[#0284C7] font-mono text-xs font-medium">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="overflow-x-auto my-3">{children}</pre>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
          ),
          th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 text-slate-700">{children}</td>,
          a: ({ href, children }) =>
            isSafeHref(href) ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0284C7] underline underline-offset-4 hover:text-[#0369A1] font-medium"
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
