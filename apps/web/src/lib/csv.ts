/**
 * CSV serialization with formula-injection protection.
 *
 * This is the single safety boundary for CSV export: every cell that Excel or
 * Google Sheets could interpret as a formula (starts with = + - @ TAB or CR) is
 * neutralized with a leading apostrophe, then quote-escaped so embedded commas,
 * quotes, and newlines are safe. Callers therefore do NOT need to pre-sanitize
 * their data — important because some export sources (e.g. AI tutor message
 * text) are raw user content.
 */

export interface CsvColumn<T> {
  readonly key: keyof T;
  readonly header: string;
}

// Leading characters that trigger formula evaluation in spreadsheet apps.
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

function escapeCell(value: unknown): string {
  let str: string;
  if (value === null || value === undefined) {
    str = "";
  } else if (typeof value === "string") {
    str = value;
  } else {
    str = String(value);
  }

  // Neutralize formula injection. Check both the raw first char and the first
  // char after trimming leading whitespace, since "   =cmd" is still dangerous.
  const firstRaw = str[0] ?? "";
  const firstTrimmed = str.trimStart()[0] ?? "";
  if (FORMULA_TRIGGERS.has(firstRaw) || FORMULA_TRIGGERS.has(firstTrimmed)) {
    str = `'${str}`;
  }

  // Always quote and escape embedded quotes so delimiters/newlines are inert.
  return `"${str.replaceAll('"', '""')}"`;
}

export function arrayToCsv<T extends Record<string, unknown>>(
  rows: readonly T[],
  columns: ReadonlyArray<CsvColumn<T>>,
): string {
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(","),
  );
  return [headerLine, ...dataLines].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // Prepend a UTF-8 BOM (U+FEFF) so Excel renders non-ASCII (Hindi / Assamese)
  // characters correctly instead of mojibake.
  const bom = "﻿";
  const blob = new Blob([`${bom}${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
