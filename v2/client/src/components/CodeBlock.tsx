import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Bloc de code façon OpenClassrooms : police à chasse fixe, indentation conservée, bouton copier. */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers indisponible : rien à faire de plus */
    }
  };
  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-[#1f3163] bg-[#0f1b2d]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wide text-[#9db3d6]">{language || "code"}</span>
        <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#b9c4d6] transition hover:bg-white/10">
          {copied ? <Check className="h-3.5 w-3.5 text-[#4ade80]" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copié !" : "Copier"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4"><code className="font-mono text-[0.85rem] leading-6 text-[#e7ebf2] whitespace-pre">{code}</code></pre>
    </div>
  );
}
