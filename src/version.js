/**
 * Version Management Module
 * Handles tracking, listing, updating, and uninstalling skills
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { downloadSkill, parseUrl } from './downloader.js';
import { formatVersion } from './hash.js';
import { parseSkillFile, scanSkills } from './scanner.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'skillman');

/**
 * Get the path to the installed skills registry file
 * @returns {string}
 */
export function getInstalledSkillsPath() {
  return process.env.SKILLMAN_INSTALLED_FILE
    ? process.env.SKILLMAN_INSTALLED_FILE
    : path.join(CONFIG_DIR, 'installed.json');
}

/**
 * Registry for tracking installed skills
 */
export class InstalledSkillRegistry {
  constructor(registryPath = getInstalledSkillsPath()) {
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
    const existingIndex = skills.findIndex(
      s => s.name === skill.name && s.agent === skill.agent
    );

    if (existingIndex >= 0) {
      skills[existingIndex] = skill;
    } else {
      skills.push(skill);
    }

    await this.save(skills);
  }

  /**
   * Remove a skill by (name, agent) composite key
   * @param {string} skillName
   * @param {string} agentName
   */
  async remove(skillName, agentName) {
    const skills = await this.load();
    const filtered = skills.filter(
      s => !(s.name === skillName && s.agent === agentName)
    );
    await this.save(filtered);
  }

  /**
   * Find a skill by (name, agent) composite key
   * @param {string} skillName
   * @param {string} agentName
   * @returns {Promise<Object|undefined>}
   */
  async find(skillName, agentName) {
    const skills = await this.load();
    return skills.find(s => s.name === skillName && s.agent === agentName);
  }

  /**
   * Find all skills with a given name (across all agents)
   * @param {string} skillName
   * @returns {Promise<Array>}
   */
  async findByName(skillName) {
    const skills = await this.load();
    return skills.filter(s => s.name === skillName);
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
export async function uninstallSkill(skillName, agentName, registry = new InstalledSkillRegistry()) {
  const skill = await registry.find(skillName, agentName);

  if (!skill) {
    return false;
  }

  if (skill.targetPath) {
    try {
      await fs.rm(skill.targetPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: Could not remove skill directory: ${error.message}`);
    }
  }

  await registry.remove(skillName, agentName);

  return true;
}

/**
 * Resolve the specific skill directory within a downloaded path.
 * If the path is already a skill directory (has SKILL.md), return it as-is.
 * Otherwise scan for a skill matching skillName within it (handles repo-level downloads).
 */
async function resolveSkillDir(downloadedPath, skillName) {
  const direct = await parseSkillFile(path.join(downloadedPath, 'SKILL.md'));
  if (direct) return downloadedPath;

  const found = await scanSkills(downloadedPath);
  const match = found.find(s => s.name === skillName);
  return match ? match.path : downloadedPath;
}

/**
 * Update a skill by reinstalling from source
 * @param {string} skillName
 * @param {InstalledSkillRegistry} registry
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function updateSkill(skillName, agentName, registry = new InstalledSkillRegistry()) {
  const skill = await registry.find(skillName, agentName);

  if (!skill) {
    return { success: false, skipped: false, oldVersion: '?', newVersion: '?', message: 'Skill not installed' };
  }

  if (!skill.sourcePath) {
    return { success: false, skipped: false, oldVersion: formatVersion(skill.version, skill.isHash) || '?', newVersion: '?', message: 'Cannot update: source path not recorded' };
  }

  const oldVersion = formatVersion(skill.version, skill.isHash) || '?';

  let sourcePath = skill.sourcePath;
  let isRemote = false;
  let tempDownloadPath = null;

  const parsed = parseUrl(sourcePath);
  if (parsed.type !== 'local') {
    isRemote = true;
    try {
      tempDownloadPath = await downloadSkill(sourcePath);
      sourcePath = await resolveSkillDir(tempDownloadPath, skillName);
    } catch (error) {
      return { success: false, skipped: false, oldVersion, newVersion: '?', message: `Failed to download: ${error.message}` };
    }
  } else {
    try {
      await fs.access(sourcePath);
    } catch {
      return { success: false, skipped: false, oldVersion, newVersion: '?', message: 'Source no longer available' };
    }
  }

  try {
    const sourceSkillFile = path.join(sourcePath, 'SKILL.md');
    const sourceSkill = await parseSkillFile(sourceSkillFile);
    const newVersion = sourceSkill ? (formatVersion(sourceSkill.version, sourceSkill.isHash) || '?') : '?';

    if (oldVersion !== '?' && newVersion !== '?' && oldVersion === newVersion) {
      return { success: true, skipped: true, oldVersion, newVersion, message: 'Already up to date' };
    }

    await copyDir(sourcePath, skill.targetPath);
    await registry.add({
      ...skill,
      version: sourceSkill?.version || skill.version,
      isHash: sourceSkill?.isHash ?? skill.isHash,
      updatedAt: new Date().toISOString()
    });

    return { success: true, skipped: false, oldVersion, newVersion, message: 'Updated successfully' };
  } finally {
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
