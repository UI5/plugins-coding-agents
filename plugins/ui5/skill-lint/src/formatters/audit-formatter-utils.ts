/**
 * Shared utilities for audit formatters
 * Provides consistent grade emoji and color mappings
 */

/**
 * Get emoji representation for a grade
 * @param grade - Letter grade (A-F)
 * @returns Emoji string
 */
export function getGradeEmoji(grade: string): string {
  switch (grade) {
    case 'A': return '🏆';
    case 'B': return '✅';
    case 'C': return '⚠️';
    case 'D': return '❌';
    case 'F': return '❌';
    default: return '❌';
  }
}

/**
 * Get color hex code for a grade (for HTML/CSS)
 * @param grade - Letter grade (A-F)
 * @returns Hex color code
 */
export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: '#28a745',
    B: '#5cb85c',
    C: '#ffc107',
    D: '#ff9800',
    F: '#dc3545',
  };
  return colors[grade] ?? colors.F;
}
