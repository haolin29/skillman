/**
 * Tests for install-target.js helper functions
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  getSkillsRelativeDir,
  resolveInstallRoot,
  validateLastInstallTarget,
  formatLastInstallTargetChoice,
  persistLastInstallTargetIfNeeded
} from '../src/install-target.js';

describe('install-target helpers', () => {
  let tempDir;

  const agents = {
    openclaw: {
      name: 'openclaw',
      displayName: 'OpenClaw',
      skillsDir: 'skills',
      globalSkillsDir: '/Users/test/.openclaw/skills'
    },
    codex: {
      name: 'codex',
      displayName: 'Codex',
      skillsDir: '.agents/skills',
      globalSkillsDir: '/Users/test/.codex/skills'
    }
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-target-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('resolves workspace install roots from workspaceRoot and skillsDir', () => {
    assert.strictEqual(getSkillsRelativeDir(agents.openclaw), 'skills');
    assert.strictEqual(getSkillsRelativeDir(agents.codex), path.join('.agents', 'skills'));
    assert.strictEqual(
      resolveInstallRoot(agents.codex, 'workspace', tempDir),
      path.join(tempDir, '.agents', 'skills')
    );
  });

  it('resolves global install roots from agent.globalSkillsDir', () => {
    assert.strictEqual(
      resolveInstallRoot(agents.openclaw, 'global', null),
      '/Users/test/.openclaw/skills'
    );
  });

  it('returns null for missing or invalid saved targets', async () => {
    assert.strictEqual(await validateLastInstallTarget(null, agents), null);
    assert.strictEqual(await validateLastInstallTarget({
      agent: 'missing',
      scope: 'workspace',
      workspaceRoot: tempDir
    }, agents), null);
    assert.strictEqual(await validateLastInstallTarget({
      agent: 'codex',
      scope: 'workspace',
      workspaceRoot: path.join(tempDir, 'missing')
    }, agents), null);
  });

  it('accepts a valid workspace saved target', async () => {
    const target = await validateLastInstallTarget({
      agent: 'codex',
      scope: 'workspace',
      workspaceRoot: tempDir
    }, agents);

    assert.deepStrictEqual(target, {
      agent: 'codex',
      scope: 'workspace',
      workspaceRoot: path.resolve(tempDir)
    });
  });

  it('formats the last install target menu label', () => {
    const label = formatLastInstallTargetChoice({
      agent: 'codex',
      scope: 'workspace',
      workspaceRoot: '/repo'
    }, agents, (key) => ({
      'option.last_install_target': 'Last install target',
      'option.workspace': 'Workspace',
      'option.global': 'Global'
    }[key]));

    assert.strictEqual(
      label,
      'Last install target (Codex / Workspace / /repo)'
    );
  });

  it('formats global reusable targets with the global skills directory', () => {
    const label = formatLastInstallTargetChoice({
      agent: 'openclaw',
      scope: 'global',
      workspaceRoot: null
    }, agents, (key) => ({
      'option.last_install_target': 'Last install target',
      'option.workspace': 'Workspace',
      'option.global': 'Global'
    }[key]));

    assert.strictEqual(
      label,
      'Last install target (OpenClaw / Global / /Users/test/.openclaw/skills)'
    );
  });

  it('persists only successful non-dry-run installs', async () => {
    const calls = [];

    const saved = await persistLastInstallTargetIfNeeded({
      dryRun: false,
      installedCount: 2,
      agent: agents.codex,
      scope: 'workspace',
      workspaceRoot: tempDir,
      saveLastInstallTarget: async (target) => calls.push(target)
    });

    assert.strictEqual(saved, true);
    assert.deepStrictEqual(calls, [{
      agent: 'codex',
      scope: 'workspace',
      workspaceRoot: tempDir
    }]);

    const dryRunSaved = await persistLastInstallTargetIfNeeded({
      dryRun: true,
      installedCount: 2,
      agent: agents.codex,
      scope: 'workspace',
      workspaceRoot: tempDir,
      saveLastInstallTarget: async () => {
        throw new Error('should not be called');
      }
    });

    const skippedSaved = await persistLastInstallTargetIfNeeded({
      dryRun: false,
      installedCount: 0,
      agent: agents.codex,
      scope: 'workspace',
      workspaceRoot: tempDir,
      saveLastInstallTarget: async () => {
        throw new Error('should not be called');
      }
    });

    assert.strictEqual(dryRunSaved, false);
    assert.strictEqual(skippedSaved, false);
  });
});
