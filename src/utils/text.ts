/**
 * Shared text utility functions
 */

/**
 * Truncate text to a specified maximum length, appending "..." if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
}
