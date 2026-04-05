/**
 * Hash utilities for skill version identification
 * Provides MD5 hashing for skills without explicit version
 */

import crypto from 'crypto';

/**
 * Compute MD5 hash of content
 * @param {string} content - File content to hash
 * @returns {string} - 32 character MD5 hash
 */
export function computeMD5(content) {
  return crypto.createHash('md5').update(content, 'utf8').digest('hex');
}

/**
 * Format version for display
 * - Real version: returns as-is (e.g., "1.2.3")
 * - Hash version: returns first 8 characters (e.g., "a1b2c3d4")
 * @param {string} version - Version string or hash
 * @param {boolean} isHash - Whether version is a hash
 * @returns {string} - Formatted version for display
 */
export function formatVersion(version, isHash) {
  if (!version) return 'unknown';
  if (isHash) {
    return version.substring(0, 8);
  }
  return version;
}
