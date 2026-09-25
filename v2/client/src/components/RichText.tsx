import { Fragment } from "react";

/** Affiche un texte de cours simple : titres (# ##), listes (- ), paragraphes et **gras**. Aucun HTML brut n'est interprété. */
export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  const inline = (value: string) =>
    value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>));
  return (
    <div className="space-y-4 text-[1.02rem] leading-8 text-[#2c3b34]">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        if (lines.every(line => /^\s*[-•]\s+/.test(line))) {
          return <ul key={index} className="list-disc space-y-1 pl-6">{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*[-•]\s+/, ""))}</li>)}</ul>;
        }
        if (block.startsWith("## ")) return <h3 key={index} className="pt-2 font-display text-xl font-semibold text-[#193f36]">{inline(block.slice(3))}</h3>;
        if (block.startsWith("# ")) return <h2 key={index} className="pt-2 font-display text-2xl font-semibold text-[#193f36]">{inline(block.slice(2))}</h2>;
        return <p key={index} className="whitespace-pre-wrap">{inline(block)}</p>;
      })}
    </div>
  );
}
