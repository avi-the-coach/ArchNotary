/**
 * exportDocument.js — export document state to HTML or Markdown.
 * Download is triggered via Tauri dialog or browser blob URL.
 */

import { markdownToHtmlFull } from "./markdownUtils";

// ── Markdown export ──────────────────────────────────────────
export function exportMarkdown(docState) {
  const { sections = {}, order = [] } = docState ?? {};
  return order
    .filter((k) => sections[k])
    .map((k) => sections[k].content)
    .join("\n\n---\n\n");
}

// ── HTML export ──────────────────────────────────────────────
export function exportHTML(docState, title = "The Notary — Document") {
  const { sections = {}, order = [] } = docState ?? {};
  const body = order
    .filter((k) => sections[k])
    .map((k) => `<section>${markdownToHtmlFull(sections[k].content)}</section>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; line-height: 1.75; }
    section { padding: 1rem 0; border-bottom: 1px solid #e2e8f0; }
    section:last-child { border-bottom: none; }
    h1 { font-size: 1.5rem; } h2 { font-size: 1.2rem; } h3 { font-size: 1rem; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

// ── Download trigger ─────────────────────────────────────────
export function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadDocument(docState, format) {
  const ts = new Date().toISOString().slice(0, 10);
  if (format === "html") {
    downloadBlob(exportHTML(docState), `notary-${ts}.html`, "text/html");
  } else {
    downloadBlob(exportMarkdown(docState), `notary-${ts}.md`, "text/markdown");
  }
}
