/**
 * Utility functions for parsing and handling @mentions
 */

// Regex pattern to match @username mentions
// Usernames can contain letters, numbers, underscores, and dots
// Must start with a letter and be 3-30 characters
const MENTION_PATTERN = /@([a-zA-Z][a-zA-Z0-9_.]{2,29})/g;

/**
 * Extract all @mentions from a text
 * @param text - The text to parse
 * @returns Array of unique usernames (without @ symbol)
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];

  const matches = text.match(MENTION_PATTERN);
  if (!matches) return [];

  // Remove @ symbol and deduplicate
  const usernames = matches.map((match) => match.substring(1).toLowerCase());
  return [...new Set(usernames)];
}

/**
 * Validate a username format
 * Rules:
 * - Must start with a letter
 * - Can contain letters, numbers, underscores, dots
 * - Must be 3-30 characters
 * - Cannot have consecutive dots or underscores
 * - Cannot end with dot or underscore
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 30) {
    return false;
  }

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(username)) {
    return false;
  }

  // Only allowed characters
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    return false;
  }

  // No consecutive dots or underscores
  if (/[_.]{2,}/.test(username)) {
    return false;
  }

  // Cannot end with dot or underscore
  if (/[_.]$/.test(username)) {
    return false;
  }

  return true;
}

/**
 * Normalize a username (lowercase, trim)
 */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim();
}

/**
 * Generate a username suggestion from a name
 * @param name - The display name
 * @param existingUsernames - Set of existing usernames to avoid
 */
export function suggestUsername(name: string, existingUsernames: Set<string> = new Set()): string {
  // Remove special characters and spaces, convert to lowercase
  let base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  // Ensure it starts with a letter
  if (!/^[a-z]/.test(base)) {
    base = 'user' + base;
  }

  // Ensure minimum length
  if (base.length < 3) {
    base = base + 'user';
  }

  // If username is available, return it
  if (!existingUsernames.has(base)) {
    return base;
  }

  // Otherwise, add numbers until we find an available one
  let counter = 1;
  let suggestion = base;
  while (existingUsernames.has(suggestion)) {
    suggestion = `${base}${counter}`;
    counter++;
    if (counter > 9999) {
      // Fallback to random
      suggestion = `${base}${Math.random().toString(36).substring(2, 6)}`;
      break;
    }
  }

  return suggestion;
}

/**
 * Convert @mentions in text to HTML links
 * @param text - The text with @mentions
 * @param baseUrl - Base URL for user profiles (e.g., /users/)
 */
export function mentionsToLinks(text: string, baseUrl = '/users/'): string {
  return text.replace(MENTION_PATTERN, (match, username) => {
    return `<a href="${baseUrl}${username.toLowerCase()}" class="mention">@${username}</a>`;
  });
}

/**
 * Strip all @mentions from text
 */
export function stripMentions(text: string): string {
  return text.replace(MENTION_PATTERN, '').replace(/\s+/g, ' ').trim();
}
