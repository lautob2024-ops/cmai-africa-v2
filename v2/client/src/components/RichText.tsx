import { CodeBlock } from "./CodeBlock";
import { fileHref } from "@/lib/upload";
import { Fragment } from "react";

const CODE_FENCE = /```([a-zA-Z0-9+#-]*)\n([\s\S]*?)```/g;

/** Affiche un texte de cours ou d'article : titres, listes, **gras**, images ![alt](clé-ou-url), et blocs ```langage ... ``` avec bouton copier. */
export function RichText({ text }: { text: string }) {
  const segments: { type: "text" | "code"; content: string; language?: string }[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(CODE_FENCE)) {
    if (match.index! > lastIndex) segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    segments.push({ type: "code", content: match[2].replace(/\n$/, ""), language: match[1] || undefined });
    lastIndex = match.index! + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ type: "text", content: text.slice(lastIndex) });

  const inline = (value: string) =>
    value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>));

  const renderText = (chunk: string, keyBase: string) => {
    const blocks = chunk.replace(/\r/g, "").split(/\n{2,}/).filter(block => block.trim().length > 0);
    return blocks.map((block, index) => {
      const key = `${keyBase}-${index}`;
      const imageMatch = block.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        const [, alt, src] = imageMatch;
        const url = /^https?:\/\//.test(src) || src.startsWith("/") ? src : fileHref(src);
        return (
          <figure key={key} className="my-5">
            <img src={url} alt={alt} loading="lazy" decoding="async" className="w-full rounded-2xl border border-[#dbe1ea] object-cover" />
            {alt && <figcaption className="mt-2 text-center text-sm text-[#5b6b82]">{alt}</figcaption>}
          </figure>
        );
      }
      const lines = block.split("\n");
      if (lines.every(line => /^\s*[-•]\s+/.test(line))) {
        return <ul key={key} className="list-disc space-y-1 pl-6">{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*[-•]\s+/, ""))}</li>)}</ul>;
      }
      if (block.startsWith("## ")) return <h3 key={key} className="pt-2 font-display text-xl font-semibold text-[#14213d]">{inline(block.slice(3))}</h3>;
      if (block.startsWith("# ")) return <h2 key={key} className="pt-2 font-display text-2xl font-semibold text-[#14213d]">{inline(block.slice(2))}</h2>;
      return <p key={key} className="whitespace-pre-wrap">{inline(block)}</p>;
    });
  };

  return (
    <div className="space-y-4 text-[1.02rem] leading-8 text-[#26313f]">
      {segments.map((segment, index) =>
        segment.type === "code"
          ? <CodeBlock key={index} code={segment.content} language={segment.language} />
          : <Fragment key={index}>{renderText(segment.content, `t${index}`)}</Fragment>
      )}
    </div>
  );
}
