/**
 * Utilities for exporting notes to Markdown, HTML, and triggering clean Print/PDF.
 */

// Helper to convert TipTap JSON document to clean Markdown
export const tipTapToMarkdown = (doc: any, noteTitle?: string, noteDate?: string): string => {
  let md = '';

  if (noteTitle) {
    md += `# ${noteTitle}\n\n`;
  }

  if (noteDate) {
    md += `*${noteDate}*\n\n---\n\n`;
  }

  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return md.trim();
  }

  const renderMarks = (text: string, marks?: any[]): string => {
    if (!marks || marks.length === 0) return text;
    let res = text;
    for (const m of marks) {
      if (m.type === 'bold') res = `**${res}**`;
      else if (m.type === 'italic') res = `*${res}*`;
      else if (m.type === 'underline') res = `<u>${res}</u>`;
      else if (m.type === 'strike') res = `~~${res}~~`;
      else if (m.type === 'code') res = `\`${res}\``;
      else if (m.type === 'highlight') res = `<mark>${res}</mark>`;
      else if (m.type === 'link') res = `[${res}](${m.attrs?.href || ''})`;
    }
    return res;
  };

  const processNode = (node: any, depth = 0): string => {
    if (!node) return '';

    if (node.type === 'text') {
      return renderMarks(node.text || '', node.marks);
    }

    if (node.type === 'paragraph') {
      const text = (node.content || []).map((c: any) => processNode(c, depth)).join('');
      return text + '\n\n';
    }

    if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      const hashes = '#'.repeat(level);
      const text = (node.content || []).map((c: any) => processNode(c, depth)).join('');
      return `${hashes} ${text}\n\n`;
    }

    if (node.type === 'blockquote') {
      const inner = (node.content || []).map((c: any) => processNode(c, depth)).join('').trim();
      return inner.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n';
    }

    if (node.type === 'horizontalRule') {
      return '---\n\n';
    }

    if (node.type === 'codeBlock') {
      const lang = node.attrs?.language || '';
      const text = (node.content || []).map((c: any) => c.text || '').join('');
      return `\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
    }

    if (node.type === 'bulletList') {
      return (node.content || []).map((item: any) => {
        const text = (item.content || []).map((c: any) => processNode(c, depth + 1)).join('').trim();
        return `${'  '.repeat(depth)}* ${text}`;
      }).join('\n') + '\n\n';
    }

    if (node.type === 'orderedList') {
      let index = 1;
      return (node.content || []).map((item: any) => {
        const text = (item.content || []).map((c: any) => processNode(c, depth + 1)).join('').trim();
        return `${'  '.repeat(depth)}${index++}. ${text}`;
      }).join('\n') + '\n\n';
    }

    if (node.type === 'taskList') {
      return (node.content || []).map((item: any) => {
        const isChecked = item.attrs?.checked;
        const text = (item.content || []).map((c: any) => processNode(c, depth + 1)).join('').trim();
        return `- [${isChecked ? 'x' : ' '}] ${text}`;
      }).join('\n') + '\n\n';
    }

    if (node.type === 'image') {
      const alt = node.attrs?.alt || 'image';
      const src = node.attrs?.src || '';
      return `![${alt}](${src})\n\n`;
    }

    if (node.type === 'table') {
      const rows = node.content || [];
      if (rows.length === 0) return '';
      let tableMd = '';
      let colCount = 0;

      rows.forEach((row: any, rIdx: number) => {
        const cells = row.content || [];
        if (rIdx === 0) colCount = cells.length;
        const rowText = cells.map((cell: any) => {
          const content = (cell.content || []).map((c: any) => processNode(c, 0)).join('').replace(/\n+/g, ' ').trim();
          return ` ${content || ' '} `;
        }).join('|');
        tableMd += `|${rowText}|\n`;

        // Insert header separator after first row
        if (rIdx === 0) {
          const sep = Array(colCount).fill(' --- ').join('|');
          tableMd += `|${sep}|\n`;
        }
      });
      return tableMd + '\n';
    }

    // Default container fallback
    if (node.content && Array.isArray(node.content)) {
      return node.content.map((c: any) => processNode(c, depth)).join('');
    }

    return '';
  };

  for (const node of doc.content) {
    md += processNode(node);
  }

  return md.trim();
};

// Trigger download in browser
export const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Generate clean standalone HTML
export const exportToHtml = (title: string, date: string, htmlBody: string): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Note'}</title>
  <style>
    body {
      font-family: 'Segoe UI', Calibri, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      max-width: 860px;
      margin: 40px auto;
      padding: 0 24px;
      color: #201f1e;
      line-height: 1.6;
    }
    h1.note-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #111827;
    }
    .note-date {
      font-size: 12px;
      color: #605e5c;
      margin-bottom: 16px;
    }
    hr.note-divider {
      border: none;
      border-top: 1px solid #e1dfdd;
      margin-bottom: 24px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
    }
    pre {
      background-color: #1e1e1e;
      color: #d4d4d4;
      padding: 14px;
      border-radius: 6px;
      overflow-x: auto;
    }
    code {
      font-family: Consolas, monospace;
    }
    blockquote {
      border-left: 3px solid #7719aa;
      margin: 16px 0;
      padding: 4px 16px;
      color: #4b5563;
      background: #faf5ff;
      border-radius: 0 4px 4px 0;
    }
    img {
      max-width: 100%;
      border-radius: 6px;
    }
    ul[data-type="taskList"] {
      list-style: none;
      padding: 0;
    }
    ul[data-type="taskList"] li {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  </style>
</head>
<body>
  <h1 class="note-title">${title || 'Untitled Page'}</h1>
  <div class="note-date">${date}</div>
  <hr class="note-divider">
  <div class="note-content">
    ${htmlBody}
  </div>
</body>
</html>`;
};

// Print / PDF helper
export const printNote = (title: string) => {
  const originalTitle = document.title;
  if (title) {
    document.title = `${title} — NoteSpace`;
  }
  window.print();
  document.title = originalTitle;
};
