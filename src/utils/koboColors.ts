/**
 * Color mapping for Kobo highlight colors to Tailwind CSS classes
 *
 * Kobo uses numeric color codes:
 * - 0: Yellow (#F5F5B9)
 * - 1: Pink (#E5ACCD)
 * - 2: Blue (#C0EAF0)
 * - 3: Green (#D2E4B3)
 */

export interface HighlightColorClasses {
  light: string;
  dark: string;
  ring: string;
  dotFill: string;
}

/**
 * Returns Tailwind CSS classes for a given Kobo highlight color code
 *
 * @param colorCode - The Kobo color code (0-3) or null/undefined
 * @returns Object containing light mode, dark mode, and ring color classes
 *
 * @example
 * ```typescript
 * const classes = getHighlightColorClasses(0); // Yellow
 * // Returns: { light: 'bg-yellow-100', dark: 'dark:bg-yellow-900/30', ring: 'ring-yellow-400 dark:ring-yellow-500' }
 * ```
 */
export function getHighlightColorClasses(colorCode?: number | null): HighlightColorClasses {
  switch (colorCode) {
    case 0: // Yellow
      return {
        light: 'bg-yellow-100',
        dark: 'dark:bg-yellow-900/30',
        ring: 'ring-yellow-400 dark:ring-yellow-500',
        dotFill: 'bg-yellow-200 dark:bg-yellow-800'
      };

    case 1: // Pink
      return {
        light: 'bg-pink-200',
        dark: 'dark:bg-pink-900/40',
        ring: 'ring-pink-400 dark:ring-pink-500',
        dotFill: 'bg-pink-300 dark:bg-pink-800'
      };

    case 2: // Blue (Cyan)
      return {
        light: 'bg-cyan-100',
        dark: 'dark:bg-cyan-900/40',
        ring: 'ring-cyan-400 dark:ring-cyan-500',
        dotFill: 'bg-cyan-200 dark:bg-cyan-800'
      };

    case 3: // Green (Lime)
      return {
        light: 'bg-lime-200',
        dark: 'dark:bg-lime-900/30',
        ring: 'ring-lime-400 dark:ring-lime-500',
        dotFill: 'bg-lime-300 dark:bg-lime-800'
      };

    default: // Fallback for null, undefined, or unknown codes
      return {
        light: 'bg-gray-50',
        dark: 'dark:bg-gray-800',
        ring: 'ring-gray-400 dark:ring-gray-500',
        dotFill: 'bg-gray-200 dark:bg-gray-700'
      };
  }
}
