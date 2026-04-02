/**
 * Skill Installer
 * Copies skill files to target location
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Install skill by copying to target directory
 * @param {string} srcPath - Source skill directory
 * @param {string} targetDir - Target installation directory
 */
export async function installSkill(srcPath, targetDir) {
  await copyDir(srcPath, targetDir);
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
