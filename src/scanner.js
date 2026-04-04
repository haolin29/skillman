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
 * Parse a single SKILL.md file to extract metadata
 * @param {string} skillFile - Path to SKILL.md
 * @returns {Promise<Object|null>} Parsed skill info or null if invalid
 */
// YAML multiline indicators to skip
const YAML_MULTILINE_INDICATORS = ['|', '>', '|-', '>-', '|+', '>+'];

/**
 * Parse description from SKILL.md content
 * Handles both simple format and YAML multiline format
 * @param {string} content - SKILL.md content
 * @returns {string} Parsed description
 */
function parseDescription(content) {
  // Try simple format first: description: some text
  const simpleMatch = content.match(/^description:\s*(.+)$/m);
  
  if (simpleMatch) {
    const value = simpleMatch[1].trim();
    
    // Check if it's a YAML multiline indicator
    if (YAML_MULTILINE_INDICATORS.includes(value)) {
      // Find the next non-empty line with proper indentation
      const lines = content.split('\n');
      const descLineIndex = lines.findIndex(line => line.match(/^description:/));
      
      if (descLineIndex >= 0) {
        // Look for indented content after the description line
        for (let i = descLineIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          // Skip empty lines
          if (!line.trim()) continue;
          // Check if line is indented (part of multiline value)
          if (line.match(/^\s+/)) {
            return line.trim();
          }
          // Not indented, means we've moved past the description
          break;
        }
      }
      return '';
    }
    
    // Regular simple value
    return value;
  }
  
  return '';
}

export async function parseSkillFile(skillFile) {
  try {
    const content = await fs.readFile(skillFile, 'utf-8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const description = parseDescription(content);
    
    // Parse version from metadata block (supports quoted and unquoted)
    const metadataMatch = content.match(/metadata:[\s\S]*?(?=\n\w|$)/);
    let version;
    if (metadataMatch) {
      const versionInMeta = metadataMatch[0].match(/^\s+version:\s*(.+)$/m);
      if (versionInMeta) {
        // Remove quotes if present (both single and double)
        version = versionInMeta[1].trim().replace(/^["']|["']$/g, '');
      }
    }
    
    if (nameMatch) {
      return {
        name: nameMatch[1].trim(),
        description: description,
        version: version
      };
    }
  } catch {
    // File doesn't exist or can't be read
  }
  
  return null;
}

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
      
      const skillInfo = await parseSkillFile(skillFile);
      if (skillInfo) {
        skills.push({
          ...skillInfo,
          path: skillPath
        });
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
