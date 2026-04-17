/**
 * Version Management Module
 * Handles tracking, listing, updating, and uninstalling skills
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { downloadSkill, parseUrl } from './downloader.js';
import { formatVersion } from './hash.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'skillman');
const INSTALLED_FILE = path.join(CONFIG_DIR, 'installed.json');

/**
 * Get the path to the installed skills registry file
 * @returns {string}
 */
export function getInstalledSkillsPath() {
  return INSTALLED_FILE;
}

/**
 * Registry for tracking installed skills
 */
export class InstalledSkillRegistry {
  constructor(registryPath = INSTALLED_FILE) {
    this.registryPath = registryPath;
  }

  /**
   * Load all installed skills from registry
   * @returns {Promise<Array>}
   */
  async load() {
    try {
      const content = await fs.readFile(this.registryPath, 'utf-8');
      const data = JSON.parse(content);
      return data.skills || [];
    } catch {
      return [];
    }
  }

  /**
   * Save skills to registry
   * @param {Array} skills
   */
  async save(skills) {
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
    const data = {
      version: 1,
      updatedAt: new Date().toISOString(),
      skills
    };
    await fs.writeFile(this.registryPath, JSON.stringify(data, null, 2));
  }

  /**
   * Add a skill to the registry
   * @param {Object} skill
   */
  async add(skill) {
    const skills = await this.load();
    const existingIndex = skills.findIndex(s => s.name === skill.name);
    
    if (existingIndex >= 0) {
      skills[existingIndex] = skill;
    } else {
      skills.push(skill);
    }
    
    await this.save(skills);
  }

  /**
   * Remove a skill from the registry
   * @param {string} skillName
   */
  async remove(skillName) {
    const skills = await this.load();
    const filtered = skills.filter(s => s.name !== skillName);
    await this.save(filtered);
  }

  /**
   * Find a skill by name
   * @param {string} skillName
   * @returns {Promise<Object|undefined>}
   */
  async find(skillName) {
    const skills = await this.load();
    return skills.find(s => s.name === skillName);
  }
}

/**
 * Format installed skills for display
 * @param {Array} skills
 * @param {Function} t - Translation function
 * @returns {Array} Formatted lines
 */
export function formatInstalledSkills(skills, t = (key) => key) {
  if (skills.length === 0) {
    return [t('msg.no_installed_skills')];
  }

  const lines = [];
  lines.push('');
  
  // Group by agent
  const byAgent = skills.reduce((acc, skill) => {
    const agent = skill.agent || 'unknown';
    if (!acc[agent]) acc[agent] = [];
    acc[agent].push(skill);
    return acc;
  }, {});
  
  for (const [agent, agentSkills] of Object.entries(byAgent)) {
    lines.push(`${agent}:`);
    for (const skill of agentSkills) {
      const scope = skill.scope === 'global' ? 'G' : 'W';
      const version = formatVersion(skill.version, skill.isHash);
      lines.push(`  ${skill.name}@${version} [${scope}]`);
    }
    lines.push('');
  }
  
  return lines;
}

/**
 * Uninstall a skill
 * @param {string} skillName
 * @param {InstalledSkillRegistry} registry
 * @returns {Promise<boolean>} - true if uninstalled, false if not found
 */
export async function uninstallSkill(skillName, registry = new InstalledSkillRegistry()) {
  const skill = await registry.find(skillName);
  
  if (!skill) {
    return false;
  }
  
  // Remove from filesystem
  if (skill.targetPath) {
    try {
      await fs.rm(skill.targetPath, { recursive: true, force: true });
    } catch (error) {
      // Log but continue - we still want to remove from registry
      console.warn(`Warning: Could not remove skill directory: ${error.message}`);
    }
  }
  
  // Remove from registry
  await registry.remove(skillName);
  
  return true;
}

/**
 * Update a skill by reinstalling from source
 * @param {string} skillName
 * @param {InstalledSkillRegistry} registry
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function updateSkill(skillName, registry = new InstalledSkillRegistry()) {
  const skill = await registry.find(skillName);
  
  if (!skill) {
    return { success: false, message: 'Skill not installed' };
  }
  
  if (!skill.sourcePath) {
    return { success: false, message: 'Cannot update: source path not recorded' };
  }
  
  let sourcePath = skill.sourcePath;
  let isRemote = false;
  let tempDownloadPath = null;
  
  // Check if sourcePath is a URL
  const parsed = parseUrl(sourcePath);
  if (parsed.type !== 'local') {
    isRemote = true;
    try {
      tempDownloadPath = await downloadSkill(sourcePath);
      sourcePath = tempDownloadPath;
    } catch (error) {
      return { success: false, message: `Failed to download: ${error.message}` };
    }
  } else {
    // Local path - check if it exists
    try {
      await fs.access(sourcePath);
    } catch {
      return { success: false, message: 'Source no longer available' };
    }
  }
  
  try {
    // Reinstall
    await copyDir(sourcePath, skill.targetPath);
    
    // Update registry with new timestamp
    await registry.add({
      ...skill,
      updatedAt: new Date().toISOString()
    });
    
    return { success: true, message: 'Updated successfully' };
  } finally {
    // Cleanup temp download if it was a remote source
    if (isRemote && tempDownloadPath) {
      try {
        await fs.rm(tempDownloadPath, { recursive: true, force: true });
      } catch {}
    }
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
    
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
