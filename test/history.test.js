/**
 * Tests for history.js - History management functionality
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadHistory, saveHistory, addWorkspace, saveLastUsed } from '../src/history.js';

describe('History Management', () => {
  let originalHistoryFile;
  let tempDir;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-history-test-'));
    originalHistoryFile = process.env.SKILLMAN_HISTORY_FILE;
    // Override history file location for testing
    process.env.SKILLMAN_HISTORY_FILE = path.join(tempDir, 'history.json');
  });

  afterEach(async () => {
    process.env.SKILLMAN_HISTORY_FILE = originalHistoryFile;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('loadHistory', () => {
    it('should return default values when file does not exist', async () => {
      const result = await loadHistory('test-agent');
      
      assert.deepStrictEqual(result, {
        workspaces: [],
        lastAgent: null,
        lastScope: null
      });
    });

    it('should load workspaces for specific agent', async () => {
      const historyData = {
        'test-agent': {
          workspaces: ['/path/to/workspace1', '/path/to/workspace2'],
          updatedAt: new Date().toISOString()
        },
        lastAgent: 'test-agent',
        lastScope: 'workspace'
      };
      await fs.writeFile(
        process.env.SKILLMAN_HISTORY_FILE,
        JSON.stringify(historyData, null, 2)
      );

      const result = await loadHistory('test-agent');
      
      assert.strictEqual(result.workspaces.length, 2);
      assert.strictEqual(result.lastAgent, 'test-agent');
      assert.strictEqual(result.lastScope, 'workspace');
    });
  });

  describe('saveLastUsed', () => {
    it('should save last agent and scope', async () => {
      await saveLastUsed('qoder', 'global');
      
      const result = await loadHistory();
      assert.strictEqual(result.lastAgent, 'qoder');
      assert.strictEqual(result.lastScope, 'global');
    });

    it('should update existing data without overwriting agent workspaces', async () => {
      await addWorkspace('qoder', '/path/to/workspace');
      await saveLastUsed('qoder', 'workspace');
      
      const result = await loadHistory('qoder');
      assert.strictEqual(result.lastAgent, 'qoder');
      assert.strictEqual(result.lastScope, 'workspace');
      assert.strictEqual(result.workspaces.length, 1);
    });
  });

  describe('addWorkspace', () => {
    it('should add workspace to history', async () => {
      await addWorkspace('qoder', '/path/to/workspace');
      
      const result = await loadHistory('qoder');
      assert.strictEqual(result.workspaces.length, 1);
      assert.strictEqual(result.workspaces[0], path.resolve('/path/to/workspace'));
    });

    it('should move existing workspace to front', async () => {
      await addWorkspace('qoder', '/path/to/workspace1');
      await addWorkspace('qoder', '/path/to/workspace2');
      await addWorkspace('qoder', '/path/to/workspace1'); // Add again
      
      const result = await loadHistory('qoder');
      assert.strictEqual(result.workspaces.length, 2);
      assert.strictEqual(result.workspaces[0], path.resolve('/path/to/workspace1'));
    });

    it('should limit history size to 10 entries', async () => {
      for (let i = 0; i < 15; i++) {
        await addWorkspace('qoder', `/path/to/workspace${i}`);
      }
      
      const result = await loadHistory('qoder');
      assert.strictEqual(result.workspaces.length, 10);
    });
  });
});
