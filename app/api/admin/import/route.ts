import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, communicationPreferences, communityHistory, memberProfiles } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { findMemberByEmail } from '@/lib/auth';
import { parseImportFile, normalizeGender } from '@/lib/import-excel';
import * as xlsx from 'xlsx';
import { rateLimit } from '@/lib/rate-limit';
import { validateOptionalEnum, MEMBER_STATUSES } from '@/lib/server-validation';

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

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

function extractColumnValue(row: any, mapping: ColumnMapping, field: keyof ColumnMapping, headerNames: string[]): any {
  const columnName = mapping[field];
  if (!columnName) return '';
  const idx = headerNames.indexOf(columnName);
  return idx >= 0 ? row[idx] : row[columnName];
}

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

    // Read all rows from the file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const allData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (allData.length <= 1) {
      return NextResponse.json({
        success: false,
        error: 'Le fichier est vide',
        createdCount: 0,
        updatedCount: 0,
        errors: [],
      });
    }

    const headers = allData[0].map((h: any) => String(h || "").trim());
    const rows = allData.slice(1);

    // Process rows
    let createdCount = 0;
    let updatedCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    // Track which emails we've already processed (to handle duplicates within the import)
    const processedEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = normalizeEmail(extractColumnValue(row, mapping, 'email', headers));

      if (!email || !email.includes('@')) {
        errors.push({ row: i + 2, message: `Ligne ${i + 2}: Email invalide` });
        continue;
      }

      // Check for duplicates within this import batch
      if (processedEmails.has(email)) {
        errors.push({ row: i + 2, message: `Ligne ${i + 2}: Double-email en import` });
        continue;
      }
      processedEmails.add(email);

      const firstName = normalizeName(extractColumnValue(row, mapping, 'firstName', headers));
      const lastName = normalizeName(extractColumnValue(row, mapping, 'lastName', headers));
      const country = extractColumnValue(row, mapping, 'country', headers) || undefined;
      const rawStatus = extractColumnValue(row, mapping, 'status', headers) || 'imported';
      const rawGender = extractColumnValue(row, mapping, 'gender', headers);
      const gender = normalizeGender(rawGender); // nullable — null means don't import

      const statusValid = validateOptionalEnum(rawStatus, MEMBER_STATUSES, 'Statut');
      const status = statusValid.ok && statusValid.value ? statusValid.value : 'imported';

      // Check if email already exists in DB
      const existingMember = await findMemberByEmail(email);

      if (existingMember) {
        // Update existing member
        try {
          const [updated] = await db
            .update(members)
            .set({
              firstName: firstName || existingMember.firstName,
              lastName: lastName || existingMember.lastName,
              country: country || existingMember.country,
              status: status,
              gender: gender !== null ? gender : existingMember.gender, // only update if mapped
              updatedAt: new Date(),
            })
            .where(eq(members.email, email))
            .returning();

          if (updated) {
            updatedCount++;
          }
        } catch (e) {
          console.error(`Import error updating row ${i + 2}:`, e);
          errors.push({ row: i + 2, message: `Ligne ${i + 2}: Une erreur s'est produite` });
        }
      } else {
        // Create new member
        try {
          const [newMember] = await db
            .insert(members)
            .values({
              email,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              country: country || undefined,
              status: status,
              gender: gender || undefined, // gender is optional (nullable field)
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          if (newMember) {
            createdCount++;

            // Also insert member profile with basic data
            await db.insert(memberProfiles).values({
              memberId: newMember.id,
              occupation: 'student',
              bio: undefined,
              linkedinUrl: undefined,
              timeAvailable: null,
              workPreference: undefined,
            });

            // NOTE: Poles should be assigned manually or via the admin poles interface.
            // Auto-assignment based on country is not implemented to avoid incorrect mappings.

            // Insert communication preferences
            await db.insert(communicationPreferences).values({
              memberId: newMember.id,
              community: true,
              security: false,
              ai: false,
              cloud: true,
              training: false,
              workshops: false,
              opportunities: false,
              projects: false,
            });

            // Insert community history
            await db.insert(communityHistory).values({
              memberId: newMember.id,
              source: 'excel_import',
              oldGroup: undefined,
              oldActivity: undefined,
              score: null,
              languages: undefined,
              metadata: JSON.stringify({ sourceFile: file.name, importedRow: i + 2 }),
              createdAt: new Date(),
            });
          }
        } catch (e) {
          console.error(`Import error creating row ${i + 2}:`, e);
          errors.push({ row: i + 2, message: `Ligne ${i + 2}: Une erreur s'est produite` });
        }
      }
    }

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
