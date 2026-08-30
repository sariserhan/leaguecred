/**
 * Escapes a value for interpolation into HTML. Email templates build markup by
 * string concatenation with no framework doing this for them, so anything
 * user-controlled — a display name above all — has to pass through here.
 */
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
