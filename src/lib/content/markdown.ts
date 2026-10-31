// Plain-text helpers for markdown written in the admin: the article outline (table of contents) and word counts.
// Client-safe. The storefront renders the same markdown with react-markdown; heading anchors are matched to this
// outline by source line (see headingIdsPlugin in components/sites/cctvmaster/content/content-markdown.tsx).
import { uniqueIds } from "./blocks";

export interface MarkdownHeading {
  id: string;
  text: string;
  level: 2 | 3;
  /** 1-based line of the heading in the source. */
  line: number;
}

const FENCE = /^ {0,3}(```|~~~)/;
const ATX = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;

/** Inline markdown → plain text: links and images keep their text, emphasis and code markers go. */
export function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Top-level h1–h3 headings in document order (h1 is shown as a main heading: the article title is the page's h1).
 * Headings inside fenced code, lists and quotes are skipped, as they aren't part of the outline.
 */
export function markdownHeadings(source: string): MarkdownHeading[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const found: Omit<MarkdownHeading, "id">[] = [];
  let fence: string | null = null;
  let paragraph = false;
  lines.forEach((line, i) => {
    const f = FENCE.exec(line);
    if (fence) {
      if (f && line.trim().startsWith(fence)) fence = null;
      return;
    }
    if (f) {
      fence = f[1];
      paragraph = false;
      return;
    }
    const atx = ATX.exec(line);
    if (atx) {
      const depth = atx[1].length;
      if (depth <= 3) found.push({ text: stripInline(atx[2]), level: depth === 3 ? 3 : 2, line: i + 1 });
      paragraph = false;
      return;
    }
    const setext = SETEXT.exec(line);
    if (setext && paragraph && i > 0) {
      const prev = lines[i - 1];
      // A single-line paragraph underlined with === or --- (a common "Title\n---" heading).
      if (!/^ {0,3}([-*+>]|\d+[.)])\s/.test(prev) && !(i > 1 && lines[i - 2].trim())) {
        found.push({ text: stripInline(prev.trim()), level: 2, line: i });
      }
      paragraph = false;
      return;
    }
    paragraph = line.trim() !== "" && !/^ {0,3}([-*+>]|\d+[.)])\s/.test(line) && !/^ {4}|\t/.test(line);
  });
  const named = found.filter((h) => h.text);
  const ids = uniqueIds(named.map((h) => h.text));
  return named.map((h, i) => ({ ...h, id: ids[i] }));
}

/** Words a reader reads: code, image addresses, link targets and markup are left out. */
export function countWords(source: string): number {
  const text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~`|-]+/g, " ");
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Reading time as the shop shows it: whole minutes at 200 words a minute, at least 1. */
export const readingMinutes = (wordCount?: number | null) => Math.max(1, Math.floor((wordCount ?? 0) / 200));
