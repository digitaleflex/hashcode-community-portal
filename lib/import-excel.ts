import * as xlsx from "xlsx";

export interface ColumnMapping {
  email?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  status?: string;
  gender?: string;
}

export interface MemberImportRow {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  status: string;
  gender: string | null;
  any: Record<string, any>;
}

export interface ImportPreview {
  headers: string[];
  rows: MemberImportRow[];
}

export async function parseImportFile(file: File): Promise<ImportPreview> {
  const name = file.name.toLowerCase();
  let workbook: xlsx.WorkBook;

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const arrayBuffer = await file.arrayBuffer();
    workbook = xlsx.read(arrayBuffer, { type: "array" });
  } else if (name.endsWith(".csv")) {
    const text = await file.text();
    workbook = xlsx.read(text, { type: 'string' });
  } else {
    throw new Error("Unsupported file type. Use .xlsx, .xls, or .csv");
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  if (data.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = data[0].map((h: any) => String(h || "").trim());

  const rows: MemberImportRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = j < row.length ? row[j] : "";
    }
    const email = String(obj["Email"] || obj["email"] || obj["e-mail"] || "").trim().toLowerCase();
    const firstName = String(obj["Prénom"] || obj["firstName"] || obj["first_name"] || "").trim();
    const lastName = String(obj["Nom"] || obj["lastName"] || obj["last_name"] || "").trim();
    const country = String(obj["Pays"] || obj["country"] || obj["country_code"] || "").trim() || "France";
    const status = String(obj["Status"] || obj["status"] || "imported").trim() || "imported";
    const gender = String(
      obj["Genre"] || obj["genre"] || obj["Gender"] || obj["gender"] || ""
    ).trim() || null;

    rows.push({
      email: email || `unknown_${i}`,
      firstName,
      lastName,
      country,
      status,
      gender,
      any: obj,
    });
  }

  return {
    headers,
    rows: rows.slice(0, 20),
  };
}

/**
 * Normalize a free-text gender value (French / English / abbreviations) to
 * one of the `genderEnum` values: male, female, other, prefer_not_to_say.
 * Returns `null` when the value is empty or unrecognized — the field is nullable.
 */
export function normalizeGender(raw: unknown): "male" | "female" | "other" | "prefer_not_to_say" | null {
  if (raw === null || raw === undefined) return null;
  const v = String(raw).trim().toLowerCase();
  if (!v) return null;

  if (["masculin", "homme", "m", "male", "man", "h"].includes(v)) return "male";
  if (["féminin", "feminin", "femme", "f", "female", "woman", "w"].includes(v)) return "female";
  if (["autre", "other", "o"].includes(v)) return "other";
  if (
    [
      "préfère ne pas dire",
      "prefere ne pas dire",
      "prefer not to say",
      "non spécifié",
      "non specifie",
      "n/a",
    ].includes(v)
  ) {
    return "prefer_not_to_say";
  }
  return null;
}