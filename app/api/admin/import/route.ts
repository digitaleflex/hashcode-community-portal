export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, communicationPreferences, communityHistory, memberProfiles } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { parseImportFile, normalizeGender, extractColumnValue, type ExcelRow } from '@/lib/import-excel';
import * as xlsx from 'xlsx';
import { rateLimit } from '@/lib/rate-limit';
import { validateOptionalEnum, MEMBER_STATUSES } from '@/lib/server-validation';

import { getClientIp } from '@/lib/request';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/plain',
]);

type ColumnMapping = {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  status: string;
  gender: string; // optional — column name for gender, empty = don't import
};

type ImportResult = {
  success: boolean;
  createdCount: number;
  updatedCount: number;
  errors: Array<{ row: number; message: string }>;
};

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name: string): string {
  return String(name || '').trim();
}

export async function POST(request: Request) {
  const { session, error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 5, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  try {
    const data = await request.formData();
    const file = data.get('file') as File;
    const mappingStr = data.get('mapping') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Le fichier dépasse la taille maximale autorisée (${MAX_FILE_SIZE / (1024 * 1024)} Mo)` },
        { status: 413 }
      );
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: `Type de fichier non autorisé: ${file.type}` },
        { status: 415 }
      );
    }

    // Audit 3.4 — le Content-Type client est contournable : vérifie la signature réelle (magic bytes).
    // Lu une seule fois ici, réutilisé plus bas pour xlsx.read.
    const arrayBuffer = await file.arrayBuffer();
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 4));
    const isZipSignature =
      headerBytes.length >= 2 && headerBytes[0] === 0x50 && headerBytes[1] === 0x4b;
    const hasNullByte = headerBytes.some((b) => b === 0x00);
    if (!isZipSignature && hasNullByte) {
      return NextResponse.json(
        { success: false, error: 'Signature de fichier invalide ou suspecte' },
        { status: 415 }
      );
    }

    // Parse the file to get preview
    const preview = await parseImportFile(file);

    // If no mapping provided, return just the preview
    if (!mappingStr) {
      return NextResponse.json({
        success: true,
        preview: {
          headers: preview.headers,
          rows: preview.rows,
        },
      });
    }

    const mapping: ColumnMapping = JSON.parse(mappingStr);

    // Read all rows from the file (réutilise l'arrayBuffer déjà lu pour la vérification de signature)
    const workbook = xlsx.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const allData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as ExcelRow[];
    
    if (allData.length <= 1) {
      return NextResponse.json({
        success: false,
        error: 'Le fichier est vide',
        createdCount: 0,
        updatedCount: 0,
        errors: [],
      });
    }

    const headers = allData[0].map((h: unknown) => String(h || "").trim());
    const rows = allData.slice(1);

    // Process rows
    let createdCount = 0;
    let updatedCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    // Track which emails we've already processed (to handle duplicates within the import)
    const processedEmails = new Set<string>();
    type PreparedRow = {
      rowIndex: number;
      email: string;
      firstName: string;
      lastName: string;
      country: string | undefined;
      status: string;
      gender: string | null;
      isNew: boolean;
    };
    const preparedRows: PreparedRow[] = [];

    // ── PHASE 1 — Validate and prepare all rows ──────────
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = normalizeEmail(extractColumnValue(row, mapping, 'email', headers) as string);

      if (!email || !email.includes('@')) {
        errors.push({ row: i + 2, message: `Ligne ${i + 2}: Email invalide` });
        continue;
      }
      if (processedEmails.has(email)) {
        errors.push({ row: i + 2, message: `Ligne ${i + 2}: Double-email en import` });
        continue;
      }
      processedEmails.add(email);

      const firstName = normalizeName(extractColumnValue(row, mapping, 'firstName', headers) as string);
      const lastName = normalizeName(extractColumnValue(row, mapping, 'lastName', headers) as string);
      const country = (extractColumnValue(row, mapping, 'country', headers) as string) || undefined;
      const rawStatus = extractColumnValue(row, mapping, 'status', headers) || 'imported';
      const rawGender = extractColumnValue(row, mapping, 'gender', headers);
      const gender = normalizeGender(rawGender);

      const statusValid = validateOptionalEnum(rawStatus, MEMBER_STATUSES, 'Statut');
      const status = statusValid.ok && statusValid.value ? statusValid.value : 'imported';

      preparedRows.push({ rowIndex: i + 2, email, firstName, lastName, country, status, gender, isNew: false });
    }

    // ── PHASE 2 — Batch check which emails already exist (1 query) ──
    const allEmails = preparedRows.map((r) => r.email);
    const existingEmailRows = await db
      .select({ email: members.email })
      .from(members)
      .where(inArray(members.email, allEmails));
    const existingEmailSet = new Set(existingEmailRows.map((r) => r.email));

    for (const row of preparedRows) {
      row.isNew = !existingEmailSet.has(row.email);
    }

    // ── PHASE 3 — Atomic insert/update inside a transaction ──
    await db.transaction(async (tx) => {
      // Process updates (existing members) one by one (fewer, no batching needed)
      for (const row of preparedRows.filter((r) => !r.isNew)) {
        try {
          await tx
            .update(members)
            .set({
              firstName: row.firstName || undefined,
              lastName: row.lastName || undefined,
              country: row.country,
              status: row.status as "imported" | "claimed" | "verified" | "updated" | "active" | "inactive",
              gender: (row.gender !== null ? row.gender : undefined) as "male" | "female" | "other" | "prefer_not_to_say" | undefined,
              updatedAt: new Date(),
            })
            .where(eq(members.email, row.email));
          updatedCount++;
        } catch (e) {
          console.error(`Import error updating row ${row.rowIndex}:`, e);
          errors.push({ row: row.rowIndex, message: `Ligne ${row.rowIndex}: Erreur de mise à jour` });
        }
      }

      // Process inserts (new members) in batches of 100
      const newRows = preparedRows.filter((r) => r.isNew);
      const BATCH_SIZE = 100;
      for (let b = 0; b < newRows.length; b += BATCH_SIZE) {
        const batch = newRows.slice(b, b + BATCH_SIZE);

        try {
          const memberValues = batch.map((row) => ({
            email: row.email,
            firstName: row.firstName || undefined,
            lastName: row.lastName || undefined,
            country: row.country,
            status: row.status as "imported" | "claimed" | "verified" | "updated" | "active" | "inactive",
            gender: (row.gender || undefined) as "other" | "male" | "female" | "prefer_not_to_say" | undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const insertedMembers = await tx.insert(members).values(memberValues).returning();

          const profileValues = insertedMembers.map((m) => ({
            memberId: m.id,
            occupation: 'student' as const,
          }));
          if (profileValues.length > 0) {
            await tx.insert(memberProfiles).values(profileValues);
          }

          const commPrefsValues = insertedMembers.map((m) => ({
            memberId: m.id,
            community: true,
            security: false,
            ai: false,
            cloud: true,
            training: false,
            workshops: false,
            opportunities: false,
            projects: false,
          }));
          if (commPrefsValues.length > 0) {
            await tx.insert(communicationPreferences).values(commPrefsValues);
          }

          const historyValues = insertedMembers.map((m, idx) => {
            const row = batch[idx];
            return {
              memberId: m.id,
              source: 'excel_import' as const,
              metadata: JSON.stringify({ sourceFile: file.name, importedRow: row.rowIndex }),
              createdAt: new Date(),
            };
          });
          if (historyValues.length > 0) {
            await tx.insert(communityHistory).values(historyValues);
          }

          createdCount += insertedMembers.length;
        } catch (e) {
          console.error(`Import error inserting batch ${Math.floor(b / BATCH_SIZE) + 1}:`, e);
          for (const row of batch) {
            errors.push({ row: row.rowIndex, message: `Ligne ${row.rowIndex}: Erreur d'insertion` });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      errors,
    });
  } catch (err) {
    console.error('Admin members error:', err);
    return NextResponse.json(
      { success: false, error: 'Une erreur est survenue. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
