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
    return {
      workspaces: history[agentName]?.workspaces || [],
      lastAgent: history.lastAgent || null,
      lastScope: history.lastScope || null
    };
  } catch {
    return { workspaces: [], lastAgent: null, lastScope: null };
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

export async function saveLastUsed(agentName, scope) {
  await ensureDir();
  let data = {};
  try {
    const existing = await fs.readFile(HISTORY_FILE, 'utf8');
    data = JSON.parse(existing);
  } catch {
    // File doesn't exist or is invalid
  }
  
  if (agentName) data.lastAgent = agentName;
  if (scope) data.lastScope = scope;
  data.updatedAt = new Date().toISOString();
  
  await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
}

export async function addWorkspace(agentName, workspacePath) {
  const normalized = path.resolve(workspacePath);
  const { workspaces } = await loadHistory(agentName);
  let newWorkspaces = [...workspaces];
  
  // Remove if exists (to move to front)
  newWorkspaces = newWorkspaces.filter(w => path.resolve(w) !== normalized);
  
  // Add to front
  newWorkspaces.unshift(normalized);
  
  await saveHistory(agentName, newWorkspaces);
  return newWorkspaces;
}
