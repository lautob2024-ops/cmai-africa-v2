/** Insère `snippet` à la position du curseur dans un textarea, et repositionne le curseur juste après. */
export function insertAtCursor(textarea: HTMLTextAreaElement | null, current: string, snippet: string, onChange: (next: string) => void) {
  if (!textarea) {
    onChange(current + (current.endsWith("\n") || !current ? "" : "\n") + snippet);
    return;
  }
  const start = textarea.selectionStart ?? current.length;
  const end = textarea.selectionEnd ?? current.length;
  const next = current.slice(0, start) + snippet + current.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const pos = start + snippet.length;
    textarea.setSelectionRange(pos, pos);
  });
}
