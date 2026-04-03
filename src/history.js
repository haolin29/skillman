/**
 * Workspace path history management
 * Stores recently used workspace paths for quick selection
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Get config directory based on platform
function getConfigDir() {
  if (process.platform === 'win32') {
    // Windows: %APPDATA%/skillman
    return path.join(process.env.APPDATA || os.homedir(), 'skillman');
  }
  // macOS/Linux: ~/.config/skillman (XDG)
  return path.join(os.homedir(), '.config', 'skillman');
}

// Allow overriding history file location for testing
function getHistoryFile() {
  return process.env.SKILLMAN_HISTORY_FILE 
    ? process.env.SKILLMAN_HISTORY_FILE
    : path.join(getConfigDir(), 'history.json');
}
const MAX_HISTORY_SIZE = 10;

async function ensureDir() {
  const historyFile = getHistoryFile();
  const dir = path.dirname(historyFile);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // If mkdir fails, try to provide more context
    if (err.code === 'ENOENT') {
      throw new Error(`Cannot create directory ${dir}: parent path does not exist`);
    }
    throw err;
  }
}

export async function loadHistory(agentName) {
  try {
    await ensureDir();
    const historyFile = getHistoryFile();
    const data = await fs.readFile(historyFile, 'utf8');
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
  const historyFile = getHistoryFile();
  let data = {};
  try {
    const existing = await fs.readFile(historyFile, 'utf8');
    data = JSON.parse(existing);
  } catch {
    // File doesn't exist or is invalid
  }
  
  data[agentName] = {
    workspaces: workspaces.slice(0, MAX_HISTORY_SIZE),
    updatedAt: new Date().toISOString()
  };
  
  await fs.writeFile(historyFile, JSON.stringify(data, null, 2));
}

export async function saveLastUsed(agentName, scope) {
  await ensureDir();
  const historyFile = getHistoryFile();
  let data = {};
  try {
    const existing = await fs.readFile(historyFile, 'utf8');
    data = JSON.parse(existing);
  } catch {
    // File doesn't exist or is invalid
  }
  
  if (agentName) data.lastAgent = agentName;
  if (scope) data.lastScope = scope;
  data.updatedAt = new Date().toISOString();
  
  await fs.writeFile(historyFile, JSON.stringify(data, null, 2));
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
