import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tipTapToMarkdown, exportToHtml, printNote } from './exportUtils';

describe('exportUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tipTapToMarkdown', () => {
    it('generates markdown with title and date header', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello NoteSpace' }],
          },
        ],
      };

      const result = tipTapToMarkdown(doc, 'My Test Note', '2026-10-09');
      expect(result).toContain('# My Test Note');
      expect(result).toContain('*2026-10-09*');
      expect(result).toContain('Hello NoteSpace');
    });

    it('formats marks correctly (bold, italic, strike, inline code, link)', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Bold Text', marks: [{ type: 'bold' }] },
              { type: 'text', text: ' ' },
              { type: 'text', text: 'Italic Text', marks: [{ type: 'italic' }] },
              { type: 'text', text: ' ' },
              { type: 'text', text: 'Inline Code', marks: [{ type: 'code' }] },
              {
                type: 'text',
                text: 'Visit Link',
                marks: [{ type: 'link', attrs: { href: 'https://notespace.app' } }],
              },
            ],
          },
        ],
      };

      const result = tipTapToMarkdown(doc);
      expect(result).toContain('**Bold Text**');
      expect(result).toContain('*Italic Text*');
      expect(result).toContain('`Inline Code`');
      expect(result).toContain('[Visit Link](https://notespace.app)');
    });

    it('converts headings and blockquotes', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Section Heading' }],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'This is an important quote.' }],
              },
            ],
          },
        ],
      };

      const result = tipTapToMarkdown(doc);
      expect(result).toContain('## Section Heading');
      expect(result).toContain('> This is an important quote.');
    });

    it('converts code blocks with language specifiers', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'typescript' },
            content: [{ type: 'text', text: 'const answer: number = 42;' }],
          },
        ],
      };

      const result = tipTapToMarkdown(doc);
      expect(result).toContain('```typescript\nconst answer: number = 42;\n```');
    });

    it('converts task lists with checkboxes', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'text', text: 'Completed task' }],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'text', text: 'Pending task' }],
              },
            ],
          },
        ],
      };

      const result = tipTapToMarkdown(doc);
      expect(result).toContain('- [x] Completed task');
      expect(result).toContain('- [ ] Pending task');
    });

    it('converts tables with markdown header row and separator', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'text', text: 'Feature' }] },
                  { type: 'tableHeader', content: [{ type: 'text', text: 'Status' }] },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  { type: 'tableCell', content: [{ type: 'text', text: 'Export Suite' }] },
                  { type: 'tableCell', content: [{ type: 'text', text: 'Ready' }] },
                ],
              },
            ],
          },
        ],
      };

      const result = tipTapToMarkdown(doc);
      expect(result).toContain('| Feature | Status |');
      expect(result).toContain('| --- | --- |');
      expect(result).toContain('| Export Suite | Ready |');
    });
  });

  describe('exportToHtml', () => {
    it('wraps HTML body in a complete HTML5 document with title and CSS styles', () => {
      const html = exportToHtml('Quarterly Review', 'October 9, 2026', '<p>Financial highlights</p>');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Quarterly Review</title>');
      expect(html).toContain('<h1 class="note-title">Quarterly Review</h1>');
      expect(html).toContain('October 9, 2026');
      expect(html).toContain('<p>Financial highlights</p>');
    });
  });

  describe('printNote', () => {
    it('sets the document title and triggers window.print', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      const originalTitle = document.title;

      printNote('Project Roadmap');

      expect(printSpy).toHaveBeenCalledTimes(1);
      // document.title should be restored after print completes
      expect(document.title).toBe(originalTitle);
    });
  });
});
