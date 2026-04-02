/**
 * Configuration Manager
 * Loads and manages agent configurations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_FILE = path.join(__dirname, 'agents.yaml');

let agentsCache = null;

/**
 * Load agents configuration from YAML file
 * @returns {Promise<Record<string, {name: string, displayName: string, skillsDir: string, globalSkillsDir: string}>>}
 */
export async function loadAgents() {
  if (agentsCache) return agentsCache;
  
  try {
    const content = await fs.readFile(AGENTS_FILE, 'utf-8');
    const agents = {};
    
    const lines = content.split('\n');
    let currentAgent = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Detect agent entry (e.g., "claude-code:")
      const agentMatch = line.match(/^(\s*)([\w-]+):\s*$/);
      if (agentMatch && agentMatch[1].length === 2) {
        currentAgent = agentMatch[2];
        agents[currentAgent] = { name: currentAgent };
        continue;
      }
      
      // Parse properties
      if (currentAgent) {
        const propMatch = line.match(/^\s+([\w]+):\s*(.+)$/);
        if (propMatch) {
          const [, key, value] = propMatch;
          let parsedValue = value.trim();
          
          // Remove quotes if present
          if ((parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
              (parsedValue.startsWith("'") && parsedValue.endsWith("'"))) {
            parsedValue = parsedValue.slice(1, -1);
          }
          
          // Expand ~ to home directory
          if (parsedValue.startsWith('~/')) {
            parsedValue = path.join(homedir(), parsedValue.slice(2));
          }
          
          agents[currentAgent][key] = parsedValue;
        }
      }
    }
    
    agentsCache = agents;
    return agents;
  } catch (err) {
    console.error(`Failed to load agents: ${err.message}`);
    return {};
  }
}

/**
 * Get a specific agent by name
 * @param {string} name - Agent name
 * @returns {Promise<object|null>}
 */
export async function getAgent(name) {
  const agents = await loadAgents();
  return agents[name] || null;
}
