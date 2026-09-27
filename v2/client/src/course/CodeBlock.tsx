import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'python',
  filename = 'script.py',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl">
      {/* En-tête du bloc de code */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-slate-300">{filename}</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-emerald-400 uppercase">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
          title="Copier le code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copié !</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>

      {/* Zone de code avec numérotation */}
      <div className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-slate-200">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="hover:bg-slate-800/40">
                <td className="w-8 select-none text-right pr-4 text-slate-600">
                  {index + 1}
                </td>
                <td className="whitespace-pre pl-2">
                  <span>{line}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};