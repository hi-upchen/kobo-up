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
 * Returns a circle emoji for a given Kobo highlight color code
 */
export function getColorEmoji(colorCode?: number | null): string {
  switch (colorCode) {
    case 0: return '🟡'; // Yellow
    case 1: return '🔴'; // Pink
    case 2: return '🔵'; // Blue
    case 3: return '🟢'; // Green
    default: return '';
  }
}

export function getHighlightColorClasses(colorCode?: number | null): HighlightColorClasses {
  switch (colorCode) {
    case 0: // Yellow
      return {
        light: 'bg-yellow-100',
        dark: 'dark:bg-yellow-900/50',
        ring: 'ring-yellow-400 dark:ring-yellow-600',
        dotFill: 'bg-yellow-400 dark:bg-yellow-600'
      };

    case 1: // Pink
      return {
        light: 'bg-pink-100',
        dark: 'dark:bg-pink-900/50',
        ring: 'ring-pink-400 dark:ring-pink-600',
        dotFill: 'bg-pink-400 dark:bg-pink-600'
      };

    case 2: // Blue
      return {
        light: 'bg-cyan-100',
        dark: 'dark:bg-cyan-900/50',
        ring: 'ring-cyan-400 dark:ring-cyan-600',
        dotFill: 'bg-cyan-400 dark:bg-cyan-600'
      };

    case 3: // Green
      return {
        light: 'bg-emerald-100',
        dark: 'dark:bg-emerald-900/50',
        ring: 'ring-emerald-400 dark:ring-emerald-600',
        dotFill: 'bg-emerald-400 dark:bg-emerald-600'
      };

    default: // Fallback for null, undefined, or unknown codes
      return {
        light: 'bg-gray-100',
        dark: 'dark:bg-gray-800',
        ring: 'ring-gray-400 dark:ring-gray-600',
        dotFill: 'bg-gray-400 dark:bg-gray-600'
      };
  }
}
