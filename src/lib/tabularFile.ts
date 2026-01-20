export type TabularFileParseResult = {
  fileContent: string;
  inferredType: "csv" | "xlsx";
  sheetName?: string;
  rowCount?: number;
};

const escapeCsvCell = (value: string) => {
  const needsQuotes = /[\n\r,"\\]/g.test(value);
  const escaped = value.replace(/\"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

const isRowEmpty = (row: unknown[]) =>
  row.every((cell) => {
    const v = String(cell ?? "").trim();
    return v.length === 0;
  });

/**
 * Converts a user-uploaded CSV/XLSX/XLS file into a clean, delimiter-separated text
 * that can be reliably parsed by the backend function.
 */
export async function toTabularText(file: File): Promise<TabularFileParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const fileContent = await file.text();
    return { fileContent, inferredType: "csv" };
  }

  if (ext === "xlsx" || ext === "xls") {
    // Lazy-load to avoid increasing initial bundle for users who never import.
    const XLSXMod = await import("xlsx");
    const XLSX: any = (XLSXMod as any).default ?? XLSXMod;

    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });

    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) {
      throw new Error("No sheets found in the Excel file");
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    // header:1 returns a matrix (rows/cols) and preserves original layout better.
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    }) as unknown[][];

    const cleanedRows = rows.filter((r) => Array.isArray(r) && !isRowEmpty(r));

    const csv = cleanedRows
      .map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(","))
      .join("\n");

    return {
      fileContent: csv,
      inferredType: "xlsx",
      sheetName,
      rowCount: cleanedRows.length,
    };
  }

  // Fallback: treat as text (keeps behavior for unknown extensions if they slip through)
  return { fileContent: await file.text(), inferredType: "csv" };
}
