import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateUUID,
  validateOptionalString,
  validateOptionalAge,
  validateOptionalLinkedinUrl,
  validateCommPrefs,
  validatePoles,
  validateInterestNames,
  slugifyName,
} from '../lib/server-validation';

describe('Server validation', () => {
  describe('validateEmail', () => {
    it('accepts and normalizes valid emails', () => {
      const result = validateEmail('  John.Doe@Example.COM ');
      expect(result).toEqual({ ok: true, value: 'john.doe@example.com' });
    });

    it('rejects missing, non-string and malformed emails', () => {
      expect(validateEmail(undefined).ok).toBe(false);
      expect(validateEmail(42).ok).toBe(false);
      expect(validateEmail('not-an-email').ok).toBe(false);
      expect(validateEmail('a@b').ok).toBe(false);
    });

    it('rejects emails over 254 characters', () => {
      const long = `${'a'.repeat(250)}@example.com`;
      expect(validateEmail(long).ok).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('accepts canonical UUIDs and rejects everything else', () => {
      expect(validateUUID('6f9619ff-8b86-d011-b42d-00cf4fc964ff')).toBe(true);
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID("'; DROP TABLE members;--")).toBe(false);
    });
  });

  describe('validateOptionalString', () => {
    it('trims and enforces max length', () => {
      expect(validateOptionalString('  Alice ', 'Prénom', 100)).toEqual({ ok: true, value: 'Alice' });
      expect(validateOptionalString('x'.repeat(101), 'Prénom', 100).ok).toBe(false);
      expect(validateOptionalString('', 'Prénom', 100)).toEqual({ ok: true, value: null });
      expect(validateOptionalString(42, 'Prénom', 100).ok).toBe(false);
    });
  });

  describe('validateOptionalAge', () => {
    it('accepts integers 16-99 and null', () => {
      expect(validateOptionalAge(25)).toEqual({ ok: true, value: 25 });
      expect(validateOptionalAge('30')).toEqual({ ok: true, value: 30 });
      expect(validateOptionalAge(null)).toEqual({ ok: true, value: null });
      expect(validateOptionalAge(10).ok).toBe(false);
      expect(validateOptionalAge(120).ok).toBe(false);
      expect(validateOptionalAge(25.5).ok).toBe(false);
      expect(validateOptionalAge('abc').ok).toBe(false);
    });
  });

  describe('validateOptionalLinkedinUrl', () => {
    it('accepts linkedin.com URLs only', () => {
      expect(validateOptionalLinkedinUrl('https://linkedin.com/in/alice').ok).toBe(true);
      expect(validateOptionalLinkedinUrl('https://www.linkedin.com/pub/alice').ok).toBe(true);
      expect(validateOptionalLinkedinUrl('https://evil.com/in/alice').ok).toBe(false);
      expect(validateOptionalLinkedinUrl('javascript:alert(1)').ok).toBe(false);
      expect(validateOptionalLinkedinUrl('not a url').ok).toBe(false);
    });
  });

  describe('validateCommPrefs', () => {
    it('keeps only whitelisted keys', () => {
      const result = validateCommPrefs({
        community: true,
        security: 'yes' as unknown as boolean,
        memberId: 'victim-id',
        id: 'forged',
        __proto__: 'pollution',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ community: true, security: false });
        expect(Object.keys(result.value).sort()).toEqual(['community', 'security']);
      }
    });

    it('rejects non-object payloads', () => {
      expect(validateCommPrefs('yes').ok).toBe(false);
      expect(validateCommPrefs([true]).ok).toBe(false);
    });
  });

  describe('validatePoles', () => {
    it('normalizes levels and drops duplicates', () => {
      const result = validatePoles([
        { slug: 'security', level: 'expert', isPrimary: true },
        { slug: 'security', level: 'beginner' },
        { slug: 'ai' },
      ]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([
          { slug: 'security', level: 'expert', isPrimary: true },
          { slug: 'ai', level: 'beginner', isPrimary: false },
        ]);
      }
    });

    it('rejects unknown levels and malformed slugs', () => {
      expect(validatePoles([{ slug: 'security', level: 'legend' }]).ok).toBe(false);
      expect(validatePoles([{ slug: 'BAD SLUG;' }]).ok).toBe(false);
      expect(validatePoles('security').ok).toBe(false);
    });
  });

  describe('validateInterestNames', () => {
    it('trims, dedupes and bounds the list', () => {
      const result = validateInterestNames(['Web Development', ' Web Development ', 'ML', '']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['Web Development', 'ML']);
      }
    });
  });

  describe('slugifyName', () => {
    it('produces stable slugs from display names', () => {
      expect(slugifyName('Web Development')).toBe('web-development');
      expect(slugifyName('CTF & Sécurité')).toBe('ctf-securite');
      expect(slugifyName('Mobile (iOS/Android)')).toBe('mobile-ios-android');
    });
  });
});
