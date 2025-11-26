import { getHighlightColorClasses } from '../koboColors';

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
