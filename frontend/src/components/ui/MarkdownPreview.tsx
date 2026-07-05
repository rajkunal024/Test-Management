const inlineParts = (text: string, isReader: boolean) => {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className={isReader ? "rounded-lg border border-white/10 bg-white/8 px-2 py-0.5 font-mono text-[0.82em] text-rose-200 shadow-inner" : "rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-900 dark:bg-slate-800 dark:text-slate-100"}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className={isReader ? "font-black text-white" : "font-black text-slate-950 dark:text-white"}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};

const isTableRow = (line: string) => /^\s*\|.+\|\s*$/.test(line);

const isTableDivider = (line: string) => {
  if (!isTableRow(line)) return false;
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
};

const parseTableCells = (line: string) =>
  line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

export const MarkdownPreview = ({ content, variant = "default" }: { content: string; variant?: "default" | "reader" }) => {
  const lines = content.split(/\r?\n/);
  const blocks: JSX.Element[] = [];
  let listItems: { text: string; ordered: boolean }[] = [];
  let tableRows: string[][] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  const isReader = variant === "reader";

  const flushList = () => {
    if (!listItems.length) return;
    const ordered = listItems[0]?.ordered;
    const ListTag = ordered ? "ol" : "ul";
    blocks.push(
      <ListTag key={`list-${blocks.length}`} className={isReader ? `${ordered ? "list-decimal" : "list-disc"} my-6 space-y-4 pl-8 text-[1.08rem] leading-9 text-zinc-100 marker:text-zinc-100` : `${ordered ? "list-decimal" : "list-disc"} my-3 space-y-1.5 pl-5 text-sm leading-7 text-slate-700 dark:text-slate-300`}>
        {listItems.map((item, index) => (
          <li key={index} className={isReader ? "pl-2" : "pl-1"}>{inlineParts(item.text, isReader)}</li>
        ))}
      </ListTag>
    );
    listItems = [];
  };

  const flushTable = () => {
    if (tableRows.length < 2) {
      tableRows = [];
      return;
    }

    const [head, ...body] = tableRows;
    blocks.push(
      <div key={`table-${blocks.length}`} className={isReader ? "my-8 overflow-x-auto rounded-2xl border border-white/12 bg-white/5" : "my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"}>
        <table className={isReader ? "min-w-full border-collapse text-left text-base text-zinc-100" : "min-w-full border-collapse text-left text-sm text-slate-700 dark:text-slate-300"}>
          <thead className={isReader ? "bg-white/10 text-zinc-50" : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"}>
            <tr>
              {head.map((cell, index) => (
                <th key={index} className={isReader ? "border-b border-white/12 px-5 py-4 font-black" : "border-b border-slate-200 px-4 py-3 font-black dark:border-slate-700"}>
                  {inlineParts(cell, isReader)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex} className={isReader ? "border-t border-white/10 odd:bg-white/[0.03]" : "border-t border-slate-200 odd:bg-slate-50 dark:border-slate-800 dark:odd:bg-slate-900/60"}>
                {head.map((_, cellIndex) => (
                  <td key={cellIndex} className={isReader ? "px-5 py-4 leading-7 text-zinc-200" : "px-4 py-3 leading-6"}>
                    {inlineParts(row[cellIndex] || "", isReader)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  const flushCode = () => {
    blocks.push(
      <div key={`code-${blocks.length}`} className={isReader ? "my-7 overflow-hidden rounded-2xl border border-white/10 bg-[#242424]" : "my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800"}>
        <div className={isReader ? "flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-sm text-zinc-400" : "flex items-center justify-between border-b border-white/10 px-3 py-2 font-mono text-xs text-slate-400"}>
          <span>{codeLanguage || "code"}</span>
          <span className="text-lg leading-none text-zinc-400">⧉</span>
        </div>
        <pre className={isReader ? "overflow-x-auto p-5 font-mono text-[1rem] leading-8 text-zinc-200" : "overflow-x-auto p-3 font-mono text-xs leading-6 text-slate-100"}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      </div>
    );
    codeLines = [];
    codeLanguage = "";
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    const codeFence = line.trim().match(/^```(\w+)?/);
    if (codeFence) {
      flushList();
      flushTable();
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = codeFence[1] || "";
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    if (!line.trim()) {
      flushList();
      flushTable();
      return;
    }

    if (/^---+$/.test(line.trim())) {
      flushList();
      flushTable();
      blocks.push(<hr key={`hr-${blocks.length}`} className={isReader ? "my-10 border-white/15" : "my-5 border-slate-200 dark:border-slate-800"} />);
      return;
    }

    if (isTableRow(line)) {
      flushList();
      if (isTableDivider(line)) return;
      tableRows.push(parseTableCells(line));
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      flushTable();
      const level = heading[1].length;
      const className = level === 1
        ? isReader ? "mb-9 mt-1 font-serif text-5xl font-black tracking-tight text-zinc-50" : "mb-3 mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white"
        : level === 2
          ? isReader ? "mb-6 mt-10 font-serif text-3xl font-black tracking-tight text-zinc-50" : "mb-2 mt-5 text-xl font-black tracking-tight text-slate-900 dark:text-slate-50"
          : isReader ? "mb-4 mt-8 font-serif text-2xl font-black text-zinc-50" : "mb-2 mt-4 text-base font-black text-slate-800 dark:text-slate-100";
      const Tag = (`h${level}` as keyof JSX.IntrinsicElements);
      blocks.push(<Tag key={`heading-${blocks.length}`} className={className}>{inlineParts(heading[2], isReader)}</Tag>);
      return;
    }

    const listMatch = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      flushTable();
      const ordered = /\d+\./.test(listMatch[1]);
      listItems.push({ ordered, text: listMatch[2] });
      return;
    }

    if (line.startsWith(">")) {
      flushList();
      flushTable();
      blocks.push(
        <blockquote key={`quote-${blocks.length}`} className={isReader ? "my-6 border-l-4 border-zinc-500 bg-white/5 py-4 pl-5 pr-4 font-serif text-xl italic leading-9 text-zinc-200" : "my-3 border-l-4 border-indigo-400 bg-indigo-50/70 py-2 pl-3 pr-3 text-sm font-semibold italic text-slate-700 dark:border-indigo-500 dark:bg-indigo-950/20 dark:text-slate-300"}>
          {inlineParts(line.replace(/^>\s?/, ""), isReader)}
        </blockquote>
      );
      return;
    }

    flushList();
    flushTable();
    blocks.push(
      <p key={`p-${blocks.length}`} className={isReader ? "my-6 font-serif text-[1.55rem] font-medium leading-[1.55] text-zinc-100" : "my-2 text-sm font-medium leading-7 text-slate-700 dark:text-slate-300"}>
        {inlineParts(line, isReader)}
      </p>
    );
  });

  flushList();
  flushTable();
  if (inCodeBlock || codeLines.length) flushCode();

  if (!content.trim()) {
    return <p className="text-sm font-semibold text-slate-400">README preview will appear here.</p>;
  }

  return (
    <div className={isReader ? "markdown-preview markdown-preview-reader" : "markdown-preview"}>
      {blocks}
    </div>
  );
};
