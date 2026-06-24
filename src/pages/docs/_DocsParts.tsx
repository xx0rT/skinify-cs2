import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Copy, Hash } from 'lucide-react';
import { spring } from '../../lib/motion';
import { getAdjacentDocsPages } from './_docsManifest';

/* ─────────────────────────────────────────────────────────────────────────
   Shared building blocks for /docs/* pages.

   Kept in one file so each docs sub-page imports cleanly and we don't
   spread tiny one-off components across the tree. Highlighting is done
   with a small token regex per language — no Prism / Shiki dep, which
   keeps the bundle slim and the build fast.
   ───────────────────────────────────────────────────────────────────────── */

export const DocsHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
}> = ({ eyebrow, title, description }) => (
  <header className="mb-8">
    {eyebrow && (
      <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent mb-2">
        {eyebrow}
      </div>
    )}
    <h1 className="text-[30px] sm:text-[40px] font-bold tracking-tight leading-[1.05] text-ink">
      {title}
    </h1>
    {description && (
      <p className="text-[15px] text-ink-muted font-medium mt-4 leading-relaxed max-w-[640px]">
        {description}
      </p>
    )}
  </header>
);

export const Section: React.FC<{
  id: string;
  title: string;
  Icon?: React.ComponentType<any>;
  children: React.ReactNode;
}> = ({ id, title, Icon, children }) => (
  <section id={id} className="docs-section mt-10 first:mt-0">
    <h2 className="group text-[22px] sm:text-[24px] font-bold tracking-tight text-ink leading-tight inline-flex items-center gap-2 scroll-mt-20">
      {Icon && (
        <span className="w-7 h-7 rounded-lg bg-accent-soft text-accent grid place-items-center shrink-0">
          <Icon size={14} strokeWidth={2.2} />
        </span>
      )}
      {title}
      <a
        href={`#${id}`}
        className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-accent transition-opacity"
        aria-label={`Anchor to ${title}`}
      >
        <Hash size={14} strokeWidth={2.4} />
      </a>
    </h2>
    <div className="mt-4">{children}</div>
  </section>
);

/* ─── Code highlighting ────────────────────────────────────────────────
   Minimal, dependency-free syntax tokenizer. Each language defines a list
   of `[regex, className]` rules; the highlighter walks the source once
   and emits styled spans. Good enough for short code samples; not a
   Prism replacement.

   Color tokens read from existing CSS vars where possible so the result
   adapts to light/dark theme.
   ─────────────────────────────────────────────────────────────────────── */

type Token = { text: string; cls?: string };

interface LangRules {
  /* Order matters — earlier patterns win for overlapping matches. */
  patterns: { re: RegExp; cls: string }[];
}

const COMMON_STRING = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/;
const COMMON_NUMBER = /\b(\d+\.?\d*)\b/;

const LANGS: Record<string, LangRules> = {
  bash: {
    patterns: [
      { re: /(^|\s)(#[^\n]*)/, cls: 'tok-comment' },
      { re: COMMON_STRING, cls: 'tok-string' },
      { re: /\b(curl|wget|http|export|echo|cat|set|cd|sudo|apt|yarn|npm|pip|pnpm|go|cargo|composer|php|python|node)\b/, cls: 'tok-keyword' },
      { re: /(-[A-Za-z]+|--[A-Za-z][A-Za-z0-9-]*)/, cls: 'tok-flag' },
      { re: /(\$[A-Za-z_][A-Za-z0-9_]*)/, cls: 'tok-var' },
    ],
  },
  json: {
    patterns: [
      { re: COMMON_STRING, cls: 'tok-string' },
      { re: /\b(true|false|null)\b/, cls: 'tok-keyword' },
      { re: COMMON_NUMBER, cls: 'tok-number' },
      { re: /[{}\[\],:]/, cls: 'tok-punct' },
    ],
  },
  http: {
    patterns: [
      { re: /^([A-Z][A-Za-z0-9-]+):/m, cls: 'tok-keyword' },
      { re: COMMON_STRING, cls: 'tok-string' },
      { re: COMMON_NUMBER, cls: 'tok-number' },
    ],
  },
  ts: {
    patterns: [
      { re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, cls: 'tok-comment' },
      { re: COMMON_STRING, cls: 'tok-string' },
      { re: /\b(import|export|from|const|let|var|function|return|async|await|new|if|else|for|while|class|extends|interface|type|as|in|of|try|catch|throw|true|false|null|undefined)\b/, cls: 'tok-keyword' },
      { re: COMMON_NUMBER, cls: 'tok-number' },
      { re: /\b([A-Z][A-Za-z0-9_]*)\b/, cls: 'tok-type' },
    ],
  },
  js: {
    patterns: [
      { re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, cls: 'tok-comment' },
      { re: COMMON_STRING, cls: 'tok-string' },
      { re: /\b(import|export|from|const|let|var|function|return|async|await|new|if|else|for|while|class|extends|try|catch|throw|true|false|null|undefined)\b/, cls: 'tok-keyword' },
      { re: COMMON_NUMBER, cls: 'tok-number' },
    ],
  },
  python: {
    patterns: [
      { re: /(#[^\n]*)/, cls: 'tok-comment' },
      { re: COMMON_STRING, cls: 'tok-string' },
      { re: /\b(import|from|as|def|class|return|if|elif|else|for|while|in|not|and|or|try|except|raise|with|pass|yield|lambda|True|False|None)\b/, cls: 'tok-keyword' },
      { re: COMMON_NUMBER, cls: 'tok-number' },
    ],
  },
  go: {
    patterns: [
      { re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/, cls: 'tok-comment' },
      { re: COMMON_STRING, cls: 'tok-string' },
      { re: /\b(package|import|func|var|const|type|struct|interface|return|if|else|for|range|switch|case|default|break|continue|go|defer|chan|map|nil|true|false)\b/, cls: 'tok-keyword' },
      { re: COMMON_NUMBER, cls: 'tok-number' },
    ],
  },
  php: {
    patterns: [
      { re: /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/, cls: 'tok-comment' },
      { re: COMMON_STRING, cls: 'tok-string' },
      { re: /\b(function|return|class|new|use|namespace|public|private|protected|static|if|else|elseif|foreach|for|while|try|catch|throw|true|false|null)\b/, cls: 'tok-keyword' },
      { re: /(\$[A-Za-z_][A-Za-z0-9_]*)/, cls: 'tok-var' },
      { re: COMMON_NUMBER, cls: 'tok-number' },
    ],
  },
};

/* Tokenize one string against a rule set. Returns a flat token list with
   un-matched spans left as plain text. */
function tokenize(source: string, lang: string): Token[] {
  const rules = LANGS[lang]?.patterns;
  if (!rules) return [{ text: source }];

  let i = 0;
  const out: Token[] = [];
  while (i < source.length) {
    let bestMatch: { start: number; end: number; cls: string } | null = null;
    for (const r of rules) {
      r.re.lastIndex = 0;
      const sub = source.slice(i);
      const m = sub.match(r.re);
      if (m && m.index !== undefined) {
        const start = i + m.index;
        const end = start + m[0].length;
        if (!bestMatch || start < bestMatch.start) {
          bestMatch = { start, end, cls: r.cls };
        }
      }
    }
    if (!bestMatch) {
      out.push({ text: source.slice(i) });
      break;
    }
    if (bestMatch.start > i) {
      out.push({ text: source.slice(i, bestMatch.start) });
    }
    out.push({ text: source.slice(bestMatch.start, bestMatch.end), cls: bestMatch.cls });
    i = bestMatch.end;
  }
  return out;
}

const Highlighted: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
  const tokens = tokenize(code, lang);
  return (
    <code>
      {tokens.map((t, i) =>
        t.cls ? (
          <span key={i} className={t.cls}>
            {t.text}
          </span>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </code>
  );
};

export const CodeBlock: React.FC<{
  code: string;
  lang?: string;
  filename?: string;
}> = ({ code, lang = 'bash', filename }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* unsupported */
    }
  };
  return (
    <div className="docs-code rounded-2xl overflow-hidden bg-[#0d0e16] border border-line my-4">
      <div className="px-3.5 pt-2 pb-1 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
        <span>{filename || lang}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={11} strokeWidth={2.6} /> : <Copy size={11} strokeWidth={2.4} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-3.5 pb-3.5 pt-1 overflow-x-auto text-[12.5px] font-mono leading-[1.6] text-zinc-100">
        <Highlighted code={code} lang={lang} />
      </pre>
    </div>
  );
};

/* ─── Tabbed multi-language code block ─────────────────────────────────
   Pass an array of { lang, label, code } samples; renders a pill row of
   language tabs above one shared CodeBlock. Active tab persists in
   localStorage so a user who picks Python stays on Python while
   navigating between docs pages. */
export interface LangSample {
  lang: string;
  label: string;
  code: string;
}

const LANG_PREF_KEY = 'skinify-docs-lang';

export const CodeTabs: React.FC<{ samples: LangSample[] }> = ({ samples }) => {
  const [active, setActive] = useState(() => {
    try {
      const saved = localStorage.getItem(LANG_PREF_KEY);
      if (saved && samples.some((s) => s.lang === saved)) return saved;
    } catch {}
    return samples[0]?.lang || 'bash';
  });
  const current = samples.find((s) => s.lang === active) || samples[0];
  const onPick = (lang: string) => {
    setActive(lang);
    try {
      localStorage.setItem(LANG_PREF_KEY, lang);
    } catch {}
  };
  return (
    <div className="my-4">
      <div className="flex items-center gap-1 -mb-2 relative z-10 px-1 overflow-x-auto scrollbar-hide">
        {samples.map((s) => {
          const isActive = s.lang === current.lang;
          return (
            <button
              key={s.lang}
              type="button"
              onClick={() => onPick(s.lang)}
              className={`relative h-7 px-2.5 rounded-t-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#0d0e16] text-zinc-200'
                  : 'bg-subtle/40 text-ink-muted hover:text-ink'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="docs-codetab-pill"
                  className="absolute inset-0 rounded-t-lg bg-[#0d0e16]"
                  transition={{ ...spring, mass: 0.6 }}
                />
              )}
              <span className="relative">{s.label}</span>
            </button>
          );
        })}
      </div>
      <CodeBlock code={current.code} lang={current.lang} />
    </div>
  );
};

/* ─── Callout ─────────────────────────────────────────────────────────── */

export const Callout: React.FC<{
  tone?: 'info' | 'warn' | 'success';
  Icon?: React.ComponentType<any>;
  children: React.ReactNode;
}> = ({ tone = 'info', Icon, children }) => {
  const toneStyles = {
    info: {
      bg: 'rgb(var(--accent) / 0.08)',
      border: 'rgb(var(--accent) / 0.35)',
      color: 'rgb(var(--accent))',
    },
    warn: {
      bg: 'rgb(245 158 11 / 0.10)',
      border: 'rgb(245 158 11 / 0.35)',
      color: 'rgb(217 119 6)',
    },
    success: {
      bg: 'rgb(16 185 129 / 0.10)',
      border: 'rgb(16 185 129 / 0.35)',
      color: 'rgb(5 150 105)',
    },
  }[tone];
  return (
    <div
      className="rounded-2xl px-4 py-3 my-4 flex items-start gap-3 text-[13px] font-medium text-ink"
      style={{ background: toneStyles.bg, boxShadow: `inset 0 0 0 1px ${toneStyles.border}` }}
    >
      {Icon && (
        <span style={{ color: toneStyles.color }} className="mt-0.5 shrink-0">
          <Icon size={15} strokeWidth={2.4} />
        </span>
      )}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
};

/* ─── Table ───────────────────────────────────────────────────────────── */

export const DocsTable: React.FC<{
  headers: string[];
  rows: (string | React.ReactNode)[][];
}> = ({ headers, rows }) => (
  <div className="card-flat overflow-x-auto my-4">
    <table className="w-full text-[12.5px] min-w-[480px]">
      <thead>
        <tr className="border-b border-line text-ink-muted">
          {headers.map((h) => (
            <th
              key={h}
              className="text-left font-bold uppercase tracking-wider text-[10.5px] px-3 py-2"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-line/40 last:border-0">
            {row.map((cell, j) => (
              <td
                key={j}
                className={`px-3 py-2 ${j === 0 ? 'font-mono text-ink font-bold' : 'text-ink-muted font-medium'}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const InlineCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="px-1.5 py-0.5 rounded-md bg-subtle text-[12.5px] font-mono text-ink font-bold">
    {children}
  </code>
);

/* ─── Endpoint header (method + path + summary) ───────────────────────── */

export const EndpointHeader: React.FC<{
  method: string;
  path: string;
  summary: string;
  description: string;
}> = ({ method, path, summary, description }) => (
  <div className="mb-6">
    <div className="flex flex-wrap items-baseline gap-2 mb-2">
      <span
        className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide"
        style={{ background: 'rgb(var(--accent) / 0.14)', color: 'rgb(var(--accent))' }}
      >
        {method}
      </span>
      <code className="text-[15px] font-mono font-bold text-ink tracking-tight">{path}</code>
    </div>
    <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-ink leading-tight">
      {summary}
    </h2>
    <p className="text-[14px] text-ink-muted font-medium mt-3 leading-relaxed max-w-[640px]">
      {description}
    </p>
  </div>
);

/* ─── Parameter table — typed wrapper around DocsTable ────────────────── */

export interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export const ParamsTable: React.FC<{ params: EndpointParam[] }> = ({ params }) => {
  if (params.length === 0) return null;
  return (
    <DocsTable
      headers={['Name', 'Type', 'Required', 'Description']}
      rows={params.map((p) => [
        p.name,
        <code key="t" className="font-mono text-ink-muted">
          {p.type}
        </code>,
        p.required ? (
          <span key="r" className="text-rose-600 dark:text-rose-400 font-bold">
            required
          </span>
        ) : (
          <span key="r" className="text-ink-dim">
            optional
          </span>
        ),
        p.description,
      ])}
    />
  );
};

/* ─── Bottom prev / next pager (uses manifest order) ──────────────────── */

export const DocsPager: React.FC<{ slug: string }> = ({ slug }) => {
  const { prev, next } = getAdjacentDocsPages(slug);
  return (
    <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {prev ? (
        <Link
          to={prev.slug === 'overview' ? '/docs' : `/docs/${prev.slug}`}
          className="card-flat px-5 py-4 hover:bg-subtle/40 transition-colors group"
        >
          <div className="label-meta">Previous</div>
          <div className="text-[14px] font-bold text-ink tracking-tight mt-1 inline-flex items-center gap-1.5">
            <ArrowLeft
              size={14}
              strokeWidth={2.4}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            {prev.label}
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          to={next.slug === 'overview' ? '/docs' : `/docs/${next.slug}`}
          className="card-flat px-5 py-4 hover:bg-subtle/40 transition-colors text-right group"
        >
          <div className="label-meta">Next</div>
          <div className="text-[14px] font-bold text-ink tracking-tight mt-1 inline-flex items-center gap-1.5">
            {next.label}
            <ArrowRight
              size={14}
              strokeWidth={2.4}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
};

/* Syntax-highlight color theme. Scoped to `.docs-code` so it doesn't leak
   to other code blocks elsewhere in the app. We inject the CSS once via
   a side-effect tag so importing this file always gets the styling. */
if (typeof document !== 'undefined' && !document.getElementById('docs-code-theme')) {
  const style = document.createElement('style');
  style.id = 'docs-code-theme';
  style.textContent = `
    .docs-code .tok-comment { color: #6b7280; font-style: italic; }
    .docs-code .tok-string { color: #fda4af; }
    .docs-code .tok-keyword { color: #c4b5fd; font-weight: 700; }
    .docs-code .tok-number { color: #fbbf24; }
    .docs-code .tok-type { color: #7dd3fc; }
    .docs-code .tok-punct { color: #94a3b8; }
    .docs-code .tok-flag { color: #fda4af; }
    .docs-code .tok-var { color: #facc15; }
  `;
  document.head.appendChild(style);
}
