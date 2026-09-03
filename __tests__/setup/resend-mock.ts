import { vi } from 'vitest';

/**
 * Mock factory for resend.
 *
 * Usage:
 *   vi.mock('resend', () => resendMock());
 *
 * After the mock, check calls with:
 *   const { emails } = new Resend();
 *   expect(emails.send).toHaveBeenCalledWith(expect.objectContaining({
 *     to: 'user@example.com',
 *     subject: '...',
 *   }));
 */
export function resendMock() {
  const sendMock = vi.fn().mockResolvedValue({ id: 'mock-email-id-123' });
  const emails = { send: sendMock };

  return {
    Resend: vi.fn().mockImplementation(() => ({ emails })),
    // ── Call inspection helpers ─────────────────────────────
    sendMock,
    getLastEmail: () => sendMock.mock.calls[sentMock.mock.calls.length - 1]?.[0] ?? null,
    getAllEmails: () => sendMock.mock.calls.map((c: [unknown]) => c[0]),
    resetAll: () => sendMock.mockReset(),
  };
}

// Shared reference so tests can inspect after import
let _sentMock: ReturnType<typeof resendMock>['sendMock'] | null = null;

/**
 * Simulates email sending failure (e.g., invalid API key).
 */
export function resendMockError(message = 'Invalid API key') {
  const sendMock = vi.fn().mockRejectedValue(new Error(message));
  return {
    Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
    sendMock,
  };
}
