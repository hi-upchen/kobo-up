import { getHighlightColorClasses, getColorEmoji } from '../koboColors';

describe('getHighlightColorClasses', () => {
  describe('Return value structure', () => {
    it('should return all required properties for valid color codes', () => {
      [0, 1, 2, 3].forEach(colorCode => {
        const result = getHighlightColorClasses(colorCode);

        expect(result.light).toMatch(/^bg-/);
        expect(result.dark).toMatch(/^dark:bg-/);
        expect(result.ring).toMatch(/^ring-/);
        expect(result.dotFill).toMatch(/^bg-/);
      });
    });

    it('should return fallback values for null, undefined, or unknown codes', () => {
      [null, undefined, 99, -1].forEach(colorCode => {
        const result = getHighlightColorClasses(colorCode);

        expect(result.light).toMatch(/^bg-/);
        expect(result.dark).toMatch(/^dark:bg-/);
        expect(result.ring).toMatch(/^ring-/);
        expect(result.dotFill).toMatch(/^bg-/);
      });
    });
  });
});

describe('getColorEmoji', () => {
  it('should return circle emoji for valid color codes', () => {
    expect(getColorEmoji(0)).toBe('🟡'); // Yellow
    expect(getColorEmoji(1)).toBe('🔴'); // Pink
    expect(getColorEmoji(2)).toBe('🔵'); // Blue
    expect(getColorEmoji(3)).toBe('🟢'); // Green
  });

  it('should return empty string for null, undefined, or unknown codes', () => {
    expect(getColorEmoji(null)).toBe('');
    expect(getColorEmoji(undefined)).toBe('');
    expect(getColorEmoji(99)).toBe('');
    expect(getColorEmoji(-1)).toBe('');
  });
});
