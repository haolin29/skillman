/**
 * Workspace path history management
 * Stores recently used workspace paths for quick selection
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const HISTORY_FILE = path.join(os.homedir(), '.config', 'skillman', 'history.json');
const MAX_HISTORY_SIZE = 10;

async function ensureDir() {
  const dir = path.dirname(HISTORY_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function loadHistory(agentName) {
  try {
    await ensureDir();
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    return history[agentName]?.workspaces || [];
  } catch {
    return [];
  }
}

export async function saveHistory(agentName, workspaces) {
  await ensureDir();
  let data = {};
  try {
    const existing = await fs.readFile(HISTORY_FILE, 'utf8');
    data = JSON.parse(existing);
  } catch {
    // File doesn't exist or is invalid
  }
  
  data[agentName] = {
    workspaces: workspaces.slice(0, MAX_HISTORY_SIZE),
    updatedAt: new Date().toISOString()
  };
  
  await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
}

export async function addWorkspace(agentName, workspacePath) {
  const normalized = path.resolve(workspacePath);
  let workspaces = await loadHistory(agentName);
  
  // Remove if exists (to move to front)
  workspaces = workspaces.filter(w => path.resolve(w) !== normalized);
  
  // Add to front
  workspaces.unshift(normalized);
  
  await saveHistory(agentName, workspaces);
  return workspaces;
}
