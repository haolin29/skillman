/**
 * URL downloader for remote skill installation
 * Supports GitHub shorthand, full URLs, and git URLs
 */

import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const TEMP_DIR = path.join(os.tmpdir(), 'skillman-downloads');

/**
 * Parse URL to determine type and extract info
 * Supports @tag or @commit suffix for version selection
 * @param {string} url - Input URL or shorthand
 * @returns {Object} { type, url, subPath, ref }
 */
export function parseUrl(url) {
  // Extract ref (tag/commit) from @ suffix
  let ref = null;
  const refMatch = url.match(/@([^@\/]+)$/);
  if (refMatch) {
    ref = refMatch[1];
    url = url.slice(0, -refMatch[0].length);
  }

  // GitHub shorthand: owner/repo or owner/repo/path
  if (/^[\w-]+\/[\w-]+/.test(url) && !url.includes('://') && !url.startsWith('git@')) {
    const parts = url.split('/');
    if (parts.length === 2) {
      return { type: 'github', url: `https://github.com/${url}.git`, subPath: null, ref };
    } else if (parts.length >= 3) {
      // owner/repo/sub/path
      return { 
        type: 'github', 
        url: `https://github.com/${parts[0]}/${parts[1]}.git`, 
        subPath: parts.slice(2).join('/'),
        ref
      };
    }
  }

  // Full GitHub URL with tree/main/path
  const treeMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/tree\/[^\/]+\/(.+)/);
  if (treeMatch) {
    return { 
      type: 'github', 
      url: `https://github.com/${treeMatch[1]}/${treeMatch[2]}.git`, 
      subPath: treeMatch[3],
      ref
    };
  }

  // Regular git URLs (https, http, git@, ssh://)
  if (url.startsWith('https://') || url.startsWith('git@') || url.startsWith('http://') || url.startsWith('ssh://')) {
    // Remove .git suffix if present for consistency
    const cleanUrl = url.replace(/\.git$/, '');
    return { type: 'git', url: cleanUrl + '.git', subPath: null, ref };
  }

  // Local path
  return { type: 'local', url, subPath: null, ref };
}

/**
 * Download skill from URL
 * @param {string} inputUrl - URL or shorthand (can include @tag or @commit)
 * @returns {Promise<string>} Path to downloaded skill directory
 */
export async function downloadSkill(inputUrl) {
  const parsed = parseUrl(inputUrl);
  
  if (parsed.type === 'local') {
    return parsed.url;
  }

  // Create temp directory
  await fs.mkdir(TEMP_DIR, { recursive: true });
  
  // Generate unique directory name
  const repoName = path.basename(parsed.url, '.git');
  const timestamp = Date.now();
  const downloadDir = path.join(TEMP_DIR, `${repoName}-${timestamp}`);

  try {
    // Clone repository
    // If ref is specified, we need full clone to checkout, otherwise shallow clone
    if (parsed.ref) {
      // Full clone for tag/commit checkout
      execFileSync('git', ['clone', parsed.url, downloadDir], {
        stdio: 'pipe',
        timeout: 120000,
        windowsHide: true
      });
      
      // Checkout the specific ref (tag or commit)
      execFileSync('git', ['-C', downloadDir, 'checkout', parsed.ref], {
        stdio: 'pipe',
        timeout: 30000,
        windowsHide: true
      });
    } else {
      // Shallow clone for latest (faster)
      execFileSync('git', ['clone', '--depth', '1', parsed.url, downloadDir], {
        stdio: 'pipe',
        timeout: 60000,
        windowsHide: true
      });
    }

    // If subPath specified, return that subdirectory
    if (parsed.subPath) {
      const subDir = path.join(downloadDir, parsed.subPath);
      try {
        await fs.access(subDir);
        return subDir;
      } catch {
        throw new Error(`Subdirectory not found: ${parsed.subPath}`);
      }
    }

    return downloadDir;
  } catch (error) {
    // Cleanup on failure
    try {
      await fs.rm(downloadDir, { recursive: true, force: true });
    } catch {}
    throw new Error(`Failed to download: ${error.message}`);
  }
}

/**
 * Clean up old downloads
 */
export async function cleanupDownloads() {
  try {
    const entries = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const entry of entries) {
      const entryPath = path.join(TEMP_DIR, entry);
      try {
        const stats = await fs.stat(entryPath);
        if (now - stats.mtime.getTime() > oneHour) {
          await fs.rm(entryPath, { recursive: true, force: true });
        }
      } catch {}
    }
  } catch {}
}
