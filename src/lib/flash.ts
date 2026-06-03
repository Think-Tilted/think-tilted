// Build a redirect target that carries a one-shot confirmation message.
// AdminLayout reads ?flash=<message>, shows a toast, then scrubs it from the
// URL. Centralising the encoding here keeps every mutation page consistent.
export function flashPath(path: string, message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}flash=${encodeURIComponent(message)}`;
}
