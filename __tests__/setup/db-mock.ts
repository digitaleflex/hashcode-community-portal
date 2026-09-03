import { vi } from 'vitest';

/**
 * Mock factory for lib/db.
 *
 * Usage in tests:
 *   vi.mock('@/lib/db', () => dbMock());
 *
 * Or auto-reset per test:
 *   const { db } = dbMock();
 *   db.select.mockResolvedValue([]);
 */
export function dbMock() {
  return {
    db: {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      limit: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
    },
    // ── Typed helpers for common patterns ──────────────────
    mockSelectReturning: vi.fn().mockResolvedValue([]),
    mockInsertReturning: vi.fn().mockResolvedValue([{ id: 'member-1' }]),
    mockUpdateReturning: vi.fn().mockResolvedValue([{ id: 'member-1' }]),
    mockDeleteReturning: vi.fn().mockResolvedValue([{ id: 'member-1' }]),
    mockUpdateZero: vi.fn().mockResolvedValue([]),
    resetAll: () => {
      vi.clearAllMocks();
    },
  };
}

/**
 * Convenience: returns a pre-wired mock db with typed helpers.
 * Call .resetAll() in beforeEach.
 */
export function createMockDb() {
  const m = dbMock();

  // Wire returning() to respect the typed helpers
  m.db.returning.mockImplementation(() => {
    if (m.mockSelectReturning.mock.calls.length || m.mockUpdateReturning.mock.calls.length) {
      return m.mockSelectReturning();
    }
    return m.mockInsertReturning();
  });

  return m;
}
