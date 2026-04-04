/**
 * Skill Scanner
 * Scans a directory for installable skills (folders with SKILL.md)
 * Also checks common skill subdirectories like 'skills/'
 */

import fs from 'fs/promises';
import path from 'path';

// Common skill container directories
const SKILL_CONTAINERS = ['skills', '.agents/skills', '.claude/skills'];

/**
 * Scan a single directory for skills
 * @param {string} dir - Directory to scan
 * @returns {Promise<Array>} Found skills
 */
async function scanSingleDir(dir) {
  const skills = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      const skillPath = path.join(dir, entry.name);
      const skillFile = path.join(skillPath, 'SKILL.md');
      
      try {
        const content = await fs.readFile(skillFile, 'utf-8');
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const descMatch = content.match(/^description:\s*(.+)$/m);
        // Parse version from metadata block
        const metadataMatch = content.match(/metadata:[\s\S]*?(?=\n\w|$)/);
        let version;
        if (metadataMatch) {
          const versionInMeta = metadataMatch[0].match(/^\s+version:\s*(.+)$/m);
          if (versionInMeta) {
            version = versionInMeta[1].trim();
          }
        }
        
        if (nameMatch) {
          skills.push({
            name: nameMatch[1].trim(),
            path: skillPath,
            description: descMatch ? descMatch[1].trim() : '',
            version: version
          });
        }
      } catch {
        // No SKILL.md or parse error, skip
      }
    }
  } catch {
    // Directory read error
  }
  
  return skills;
}

/**
 * Scan directory for skills
 * @param {string} dir - Directory to scan
 * @returns {Promise<Array<{name: string, path: string, description: string}>>}
 */
export async function scanSkills(dir) {
  // First scan root directory
  const skills = await scanSingleDir(dir);
  if (skills.length > 0) {
    return skills;
  }
  
  // If no skills found, check common skill container directories
  for (const container of SKILL_CONTAINERS) {
    const containerPath = path.join(dir, container);
    try {
      await fs.access(containerPath);
      const containerSkills = await scanSingleDir(containerPath);
      if (containerSkills.length > 0) {
        return containerSkills;
      }
    } catch {
      // Container doesn't exist, skip
    }
  }
  
  return [];
}

/**
 * Parse a single SKILL.md file to extract metadata
 * @param {string} skillFile - Path to SKILL.md
 * @returns {Promise<Object|null>} Parsed skill info or null if invalid
 */
export async function parseSkillFile(skillFile) {
  try {
    const content = await fs.readFile(skillFile, 'utf-8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    
    // Parse version from metadata block
    const metadataMatch = content.match(/metadata:[\s\S]*?(?=\n\w|$)/);
    let version;
    if (metadataMatch) {
      const versionInMeta = metadataMatch[0].match(/^\s+version:\s*(.+)$/m);
      if (versionInMeta) {
        version = versionInMeta[1].trim();
      }
    }
    
    if (nameMatch) {
      return {
        name: nameMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : '',
        version: version
      };
    }
  } catch {
    // File doesn't exist or can't be read
  }
  
  return null;
}
