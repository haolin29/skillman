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
  await copySkillFiles(srcPath, targetDir, { rootLevel: metadata.rootLevel });
  
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
 * Copy a skill from srcPath to destPath.
 * When rootLevel is true (SKILL.md is at the repo root rather than in its own subdir),
 * only SKILL.md is copied — everything else in the repo is irrelevant to the skill.
 * @param {string} src
 * @param {string} dest
 * @param {{ rootLevel?: boolean }} options
 */
export async function copySkillFiles(src, dest, { rootLevel = false } = {}) {
  await fs.mkdir(dest, { recursive: true });
  if (rootLevel) {
    await fs.copyFile(path.join(src, 'SKILL.md'), path.join(dest, 'SKILL.md'));
    return;
  }
  await copyDir(src, dest);
}

/**
 * Copy directory recursively, skipping hidden files and node_modules
 * @param {string} src
 * @param {string} dest
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      await copyDir(path.join(src, entry.name), path.join(dest, entry.name));
    } else {
      await fs.copyFile(path.join(src, entry.name), path.join(dest, entry.name));
    }
  }
}
