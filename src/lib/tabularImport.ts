type RowMap = Record<string, string>;

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function detectDelimiter(header: string): string {
  const semis = (header.match(/;/g) ?? []).length;
  const commas = (header.match(/,/g) ?? []).length;
  return semis >= commas ? ";" : ",";
}

export function parseCsvRows(text: string): RowMap[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const first = lines[0].toLowerCase();
  const dataLines = first.startsWith("sep=") ? lines.slice(1) : lines;
  if (dataLines.length === 0) return [];

  const delimiter = detectDelimiter(dataLines[0]);
  const headers = parseDelimitedLine(dataLines[0], delimiter).map(normalizeHeader);
  const rows: RowMap[] = [];
  for (const line of dataLines.slice(1)) {
    const cols = parseDelimitedLine(line, delimiter);
    const row: RowMap = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = (cols[i] ?? "").trim();
    }
    if (Object.values(row).some((v) => v.length > 0)) rows.push(row);
  }
  return rows;
}

export async function parseXlsxRows(file: File): Promise<RowMap[]> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const ws = workbook.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const headers = headerRow.values
    .slice(1)
    .map((v) => normalizeHeader(String(v ?? "")));

  const rows: RowMap[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const map: RowMap = {};
    headers.forEach((h, idx) => {
      const raw = row.getCell(idx + 1).value;
      const val =
        raw && typeof raw === "object" && "text" in raw
          ? String(raw.text ?? "")
          : raw instanceof Date
            ? raw.toISOString().slice(0, 10)
            : String(raw ?? "");
      map[h] = val.trim();
    });
    if (Object.values(map).some((v) => v.length > 0)) rows.push(map);
  }
  return rows;
}

export async function parseTabularFile(file: File): Promise<RowMap[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsvRows(await file.text());
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseXlsxRows(file);
  throw new Error("Formato não suportado. Use CSV ou XLSX.");
}
