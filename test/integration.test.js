import { test } from 'node:test';
import assert from 'node:assert';
import { scanSkills } from '../src/scanner.js';
import { installSkill } from '../src/installer.js';
import { InstalledSkillRegistry, uninstallSkill } from '../src/version.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

test('full workflow: scan, install, list, uninstall', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-integration-'));
  const srcDir = path.join(tmpDir, 'source');
  const targetDir = path.join(tmpDir, 'target');
  const registryPath = path.join(tmpDir, 'installed.json');
  
  // Create a skill with version
  const skillDir = path.join(srcDir, 'my-skill');
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), `---
name: my-skill
description: Test skill
metadata:
  version: 1.0.0
---

# My Skill
`);
  
  // Scan
  const skills = await scanSkills(srcDir);
  assert.strictEqual(skills.length, 1);
  assert.strictEqual(skills[0].version, '1.0.0');
  
  // Install
  const skillTarget = path.join(targetDir, 'my-skill');
  await installSkill(skillDir, skillTarget, {
    name: 'my-skill',
    version: '1.0.0',
    agent: 'qoder',
    scope: 'global'
  });
  
  // Verify files copied
  const installedContent = await fs.readFile(path.join(skillTarget, 'SKILL.md'), 'utf-8');
  assert.ok(installedContent.includes('my-skill'));
  
  // List
  const registry = new InstalledSkillRegistry(registryPath);
  await registry.add({
    name: 'my-skill',
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    agent: 'qoder',
    scope: 'global',
    sourcePath: skillDir,
    targetPath: skillTarget
  });
  
  const installed = await registry.load();
  assert.strictEqual(installed.length, 1);
  
  // Uninstall
  await uninstallSkill('my-skill', registry);
  
  const afterUninstall = await registry.load();
  assert.strictEqual(afterUninstall.length, 0);
  
  try {
    await fs.access(skillTarget);
    assert.fail('Target should have been removed');
  } catch {
    // Expected
  }
  
  // Cleanup
  await fs.rm(tmpDir, { recursive: true });
});
