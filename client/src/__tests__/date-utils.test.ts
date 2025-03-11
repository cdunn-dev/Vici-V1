import { formatDate, formatDateForApi, isValidDate } from '@/lib/date-utils';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('formats a valid date correctly', () => {
      expect(formatDate('2025-03-15')).toBe('Mar 15, 2025');
    });

    it('handles custom format string', () => {
      expect(formatDate('2025-03-15', 'yyyy/MM/dd')).toBe('2025/03/15');
    });

    it('returns "Invalid date" for invalid input', () => {
      expect(formatDate('')).toBe('Invalid date');
      expect(formatDate('invalid')).toBe('Invalid date');
      expect(formatDate(undefined as any)).toBe('Invalid date');
      expect(formatDate(null as any)).toBe('Invalid date');
    });

    it('handles date strings with time component', () => {
      expect(formatDate('2025-03-15T12:00:00Z')).toBe('Mar 15, 2025');
    });
  });

  describe('formatDateForApi', () => {
    it('formats a valid date correctly', () => {
      expect(formatDateForApi('2025-03-15')).toBe('2025-03-15');
    });

    it('handles date strings with time component', () => {
      expect(formatDateForApi('2025-03-15T12:00:00Z')).toBe('2025-03-15');
    });

    it('throws error for invalid dates', () => {
      expect(() => formatDateForApi('')).toThrow();
      expect(() => formatDateForApi('invalid-date')).toThrow();
      expect(() => formatDateForApi(undefined as any)).toThrow();
      expect(() => formatDateForApi(null as any)).toThrow();
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid dates', () => {
      expect(isValidDate('2025-03-15')).toBe(true);
      expect(isValidDate('2025-03-15T12:00:00Z')).toBe(true);
    });

    it('returns false for invalid dates', () => {
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate(undefined as any)).toBe(false);
      expect(isValidDate(null as any)).toBe(false);
    });

    it('returns false for invalid date values', () => {
      expect(isValidDate('2025-13-32')).toBe(false); // Invalid month and day
      expect(isValidDate('2025-02-30')).toBe(false); // Invalid February date
    });
  });
});