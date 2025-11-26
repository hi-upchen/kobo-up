import { getHighlightColorClasses } from '../koboColors';

describe('getHighlightColorClasses', () => {
  describe('Kobo color code 0 (Yellow)', () => {
    it('should return correct yellow classes', () => {
      const result = getHighlightColorClasses(0);

      expect(result).toEqual({
        light: 'bg-yellow-100',
        dark: 'dark:bg-yellow-900/30',
        ring: 'ring-yellow-400 dark:ring-yellow-500',
        dotFill: 'bg-yellow-200 dark:bg-yellow-800'
      });
    });
  });

  describe('Kobo color code 1 (Pink)', () => {
    it('should return correct pink classes', () => {
      const result = getHighlightColorClasses(1);

      expect(result).toEqual({
        light: 'bg-pink-200',
        dark: 'dark:bg-pink-900/40',
        ring: 'ring-pink-400 dark:ring-pink-500',
        dotFill: 'bg-pink-300 dark:bg-pink-800'
      });
    });
  });

  describe('Kobo color code 2 (Blue/Cyan)', () => {
    it('should return correct cyan classes', () => {
      const result = getHighlightColorClasses(2);

      expect(result).toEqual({
        light: 'bg-cyan-100',
        dark: 'dark:bg-cyan-900/40',
        ring: 'ring-cyan-400 dark:ring-cyan-500',
        dotFill: 'bg-cyan-200 dark:bg-cyan-800'
      });
    });
  });

  describe('Kobo color code 3 (Green/Lime)', () => {
    it('should return correct lime classes', () => {
      const result = getHighlightColorClasses(3);

      expect(result).toEqual({
        light: 'bg-lime-200',
        dark: 'dark:bg-lime-900/30',
        ring: 'ring-lime-400 dark:ring-lime-500',
        dotFill: 'bg-lime-300 dark:bg-lime-800'
      });
    });
  });

  describe('Fallback cases (null, undefined, unknown)', () => {
    it('should return gray classes for null', () => {
      const result = getHighlightColorClasses(null);

      expect(result).toEqual({
        light: 'bg-gray-50',
        dark: 'dark:bg-gray-800',
        ring: 'ring-gray-400 dark:ring-gray-500',
        dotFill: 'bg-gray-200 dark:bg-gray-700'
      });
    });

    it('should return gray classes for undefined', () => {
      const result = getHighlightColorClasses(undefined);

      expect(result).toEqual({
        light: 'bg-gray-50',
        dark: 'dark:bg-gray-800',
        ring: 'ring-gray-400 dark:ring-gray-500',
        dotFill: 'bg-gray-200 dark:bg-gray-700'
      });
    });

    it('should return gray classes for unknown color code', () => {
      const result = getHighlightColorClasses(99);

      expect(result).toEqual({
        light: 'bg-gray-50',
        dark: 'dark:bg-gray-800',
        ring: 'ring-gray-400 dark:ring-gray-500',
        dotFill: 'bg-gray-200 dark:bg-gray-700'
      });
    });
  });

  describe('Return value structure', () => {
    it('should always return object with all required properties', () => {
      const testCases = [0, 1, 2, 3, null, undefined, 99];

      testCases.forEach(colorCode => {
        const result = getHighlightColorClasses(colorCode);

        expect(result).toHaveProperty('light');
        expect(result).toHaveProperty('dark');
        expect(result).toHaveProperty('ring');
        expect(result).toHaveProperty('dotFill');
      });
    });
  });
});
