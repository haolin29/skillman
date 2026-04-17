/**
 * Skill Installer
 * Copies skill files to target location
 */

import fs from 'fs/promises';
import path from 'path';
import { InstalledSkillRegistry } from './version.js';

/**
 * Install skill by copying to target directory
 * @param {string} srcPath - Source skill directory
 * @param {string} targetDir - Target installation directory
 * @param {Object} metadata - Installation metadata
 * @param {string} metadata.name - Skill name
 * @param {string} metadata.version - Skill version
 * @param {boolean} metadata.isHash - Whether version is a hash
 * @param {string} metadata.agent - Target agent name
 * @param {string} metadata.scope - Installation scope (global|workspace)
 * @param {string} metadata.sourceUrl - Original source URL (for remote installs)
 */
export async function installSkill(srcPath, targetDir, metadata = {}) {
  await copyDir(srcPath, targetDir);
  
  // Record installation if metadata provided
  if (metadata.name) {
    const registry = new InstalledSkillRegistry();
    await registry.add({
      name: metadata.name,
      version: metadata.version,
      isHash: metadata.isHash || false,
      installedAt: new Date().toISOString(),
      agent: metadata.agent,
      scope: metadata.scope,
      sourcePath: metadata.sourceUrl || srcPath,
      targetPath: targetDir
    });
  }
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip node_modules and hidden files
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
