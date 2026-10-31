// CSV reading and writing for the admin's spreadsheet import and export (RFC 4180, as Excel and Google Sheets write it).

export interface CsvRecord {
  /** Row number as a spreadsheet shows it (the header is row 1). */
  line: number;
  cells: string[];
}

/** The delimiter used on the header line: comma, or semicolon/tab as some spreadsheet locales save. */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r|\n/) === -1 ? text.length : text.search(/\r|\n/));
  const count = (ch: string) => firstLine.split(ch).length - 1;
  return [",", ";", "\t"].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ",");
}

/**
 * Splits CSV text into records. Handles quoted cells containing delimiters, doubled quotes and line breaks, CRLF or LF
 * line endings and a byte-order mark. Blank records are dropped but still counted, so line numbers match the
 * spreadsheet's row numbers.
 */
export function parseCsv(text: string): CsvRecord[] {
  const input = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(input);
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  const endRecord = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== "")) records.push({ line, cells });
    cells = [];
    cell = "";
    line++;
  };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) {
      cells.push(cell);
      cell = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      endRecord();
    } else cell += ch;
  }
  if (cell !== "" || cells.length) endRecord();
  return records;
}

/** Values a spreadsheet would run as a formula get a leading apostrophe on export (see csvCell). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Removes the apostrophe csvCell adds in front of formula-like values, so exported files import unchanged. */
export const unguardCell = (value: string) => (value.startsWith("'") && FORMULA_START.test(value.slice(1)) ? value.slice(1) : value);

/** One CSV cell: RFC 4180 quoting, plus a leading apostrophe on values a spreadsheet would run as a formula. */
export function csvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A whole CSV file with a byte-order mark, so Excel opens it as UTF-8 (£, accents). */
export const toCsv = (rows: (string | number | null | undefined)[][]) => `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
