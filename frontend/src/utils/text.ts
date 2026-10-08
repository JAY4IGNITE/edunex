// Display-only repair of dash mojibake from Windows-decoded source metadata.
// The backend's source identity, authenticity and analytical values are preserved.
export function readableSourceText(text: string) {
  return text
    .replaceAll("\u00e2\u20ac\u201d", "\u2014")
    .replaceAll("\u00e2\u20ac\u201c", "\u2013");
}
