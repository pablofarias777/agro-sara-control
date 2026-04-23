type CsvHeader<T extends Record<string, unknown>> = {
  key: keyof T;
  label: string;
  format?: (value: unknown, row: T) => string;
};

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

/** Convert array of objects to CSV string (Excel-friendly with ; separator) */
export function toCSV<T extends Record<string, unknown>>(rows: T[], headers: CsvHeader<T>[]): string {
  const headerLine = headers.map((h) => escapeCsv(h.label)).join(";");
  const lines = rows.map((row) =>
    headers
      .map((h) => {
        const raw = row[h.key];
        const value = h.format ? h.format(raw, row) : String(raw ?? "");
        return escapeCsv(value);
      })
      .join(";")
  );
  return ["sep=;", headerLine, ...lines].join("\n");
}

/** Trigger file download in browser */
export function downloadFile(content: string, filename: string, type = "text/csv;charset=utf-8;") {
  const blob = new Blob(["\uFEFF" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
