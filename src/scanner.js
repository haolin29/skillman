/**
 * Skill Scanner
 * Scans a directory for installable skills (folders with SKILL.md)
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Scan directory for skills
 * @param {string} dir - Directory to scan
 * @returns {Promise<Array<{name: string, path: string, description: string}>>}
 */
export async function scanSkills(dir) {
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
        
        if (nameMatch) {
          skills.push({
            name: nameMatch[1].trim(),
            path: skillPath,
            description: descMatch ? descMatch[1].trim() : ''
          });
        }
      } catch {
        // No SKILL.md or parse error, skip
      }
    }
  } catch (err) {
    // Directory read error
  }
  
  return skills;
}
