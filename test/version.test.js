import { test } from 'node:test';
import assert from 'node:assert';
import { InstalledSkillRegistry, getInstalledSkillsPath, formatInstalledSkills, uninstallSkill, updateSkill } from '../src/version.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

test('getInstalledSkillsPath returns correct path', () => {
  const configDir = path.join(os.homedir(), '.config', 'skillman');
  const expectedPath = path.join(configDir, 'installed.json');
  assert.strictEqual(getInstalledSkillsPath(), expectedPath);
});

test('InstalledSkillRegistry loads empty when file does not exist', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  
  const registry = new InstalledSkillRegistry(registryPath);
  const skills = await registry.load();
  
  assert.deepStrictEqual(skills, []);
  
  // Cleanup
  await fs.rm(tmpDir, { recursive: true });
});

test('InstalledSkillRegistry can add and save skills with isHash flag', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  
  const registry = new InstalledSkillRegistry(registryPath);
  
  // Add skill with real version
  const skillWithVersion = {
    name: 'test-skill',
    version: '1.0.0',
    isHash: false,
    installedAt: new Date().toISOString(),
    agent: 'qoder',
    scope: 'global',
    sourcePath: '/path/to/source',
    targetPath: '/path/to/target'
  };
  
  await registry.add(skillWithVersion);
  
  // Add skill with hash version
  const skillWithHash = {
    name: 'hash-skill',
    version: 'a1b2c3d4e5f6789012345678abcdef01',
    isHash: true,
    installedAt: new Date().toISOString(),
    agent: 'qoder',
    scope: 'global',
    sourcePath: '/path/to/source2',
    targetPath: '/path/to/target2'
  };
  
  await registry.add(skillWithHash);
  
  const skills = await registry.load();
  
  assert.strictEqual(skills.length, 2);
  
  const realVersionSkill = skills.find(s => s.name === 'test-skill');
  assert.strictEqual(realVersionSkill.isHash, false);
  assert.strictEqual(realVersionSkill.version, '1.0.0');
  
  const hashSkill = skills.find(s => s.name === 'hash-skill');
  assert.strictEqual(hashSkill.isHash, true);
  assert.strictEqual(hashSkill.version, 'a1b2c3d4e5f6789012345678abcdef01');
  
  // Cleanup
  await fs.rm(tmpDir, { recursive: true });
});

test('listInstalledSkills returns formatted skill list', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  
  const registry = new InstalledSkillRegistry(registryPath);
  
  await registry.add({
    name: 'skill-a',
    version: '1.0.0',
    installedAt: '2025-04-01T10:00:00Z',
    agent: 'qoder',
    scope: 'global'
  });
  
  await registry.add({
    name: 'skill-b',
    version: '2.1.0',
    installedAt: '2025-04-02T11:00:00Z',
    agent: 'claude-code',
    scope: 'workspace'
  });
  
  const skills = await registry.load();
  
  assert.strictEqual(skills.length, 2);
  assert.strictEqual(skills[0].name, 'skill-a');
  assert.strictEqual(skills[1].name, 'skill-b');
  
  // Cleanup
  await fs.rm(tmpDir, { recursive: true });
});

test('formatInstalledSkills handles empty list', () => {
  const result = formatInstalledSkills([]);
  assert.deepStrictEqual(result, ['msg.no_installed_skills']);
});

test('formatInstalledSkills formats skills correctly', () => {
  const skills = [
    { name: 'skill-a', version: '1.0.0', agent: 'qoder', scope: 'global' },
    { name: 'skill-b', version: '2.0.0', agent: 'qoder', scope: 'workspace' }
  ];

  const result = formatInstalledSkills(skills);

  assert.ok(result.some(line => line.includes('qoder')));
  assert.ok(result.some(line => line.includes('skill-a') && line.includes('1.0.0') && line.includes('[G]')));
  assert.ok(result.some(line => line.includes('skill-b') && line.includes('2.0.0') && line.includes('[W]')));
});

test('formatInstalledSkills handles hash versions', () => {
  const skills = [
    { name: 'versioned-skill', version: '1.2.3', isHash: false, agent: 'qoder', scope: 'global' },
    { name: 'hash-skill', version: 'a1b2c3d4e5f6789012345678abcdef01', isHash: true, agent: 'qoder', scope: 'workspace' }
  ];

  const result = formatInstalledSkills(skills);

  assert.ok(result.some(line => line.includes('versioned-skill') && line.includes('1.2.3')));
  assert.ok(result.some(line => line.includes('hash-skill') && line.includes('a1b2c3d4')));
});

test('uninstallSkill removes skill from registry and filesystem', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  const skillTargetPath = path.join(tmpDir, 'skills', 'test-skill');
  
  await fs.mkdir(skillTargetPath, { recursive: true });
  await fs.writeFile(path.join(skillTargetPath, 'SKILL.md'), '# Test');
  
  const registry = new InstalledSkillRegistry(registryPath);
  await registry.add({
    name: 'test-skill',
    agent: 'test-agent',
    version: '1.0.0',
    targetPath: skillTargetPath
  });

  // Verify skill exists
  let skills = await registry.load();
  assert.strictEqual(skills.length, 1);

  // Uninstall
  await uninstallSkill('test-skill', 'test-agent', registry);
  
  // Verify removed from registry
  skills = await registry.load();
  assert.strictEqual(skills.length, 0);
  
  // Verify removed from filesystem
  try {
    await fs.access(skillTargetPath);
    assert.fail('Skill directory should have been removed');
  } catch {
    // Expected - directory should not exist
  }

  // Cleanup
  await fs.rm(tmpDir, { recursive: true });
});

test('InstalledSkillRegistry.add supports same skill name in different agents', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  const registry = new InstalledSkillRegistry(registryPath);

  await registry.add({ name: 'brainstorming', agent: 'claude', version: '1.0.0', scope: 'global', targetPath: '/a' });
  await registry.add({ name: 'brainstorming', agent: 'cursor', version: '1.0.0', scope: 'global', targetPath: '/b' });

  const skills = await registry.load();
  assert.strictEqual(skills.length, 2);

  await fs.rm(tmpDir, { recursive: true });
});

test('InstalledSkillRegistry.find requires (name, agent) and returns exact match', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  const registry = new InstalledSkillRegistry(registryPath);

  await registry.add({ name: 'brainstorming', agent: 'claude', version: '1.0.0', scope: 'global', targetPath: '/a' });
  await registry.add({ name: 'brainstorming', agent: 'cursor', version: '2.0.0', scope: 'global', targetPath: '/b' });

  const found = await registry.find('brainstorming', 'claude');
  assert.strictEqual(found.agent, 'claude');
  assert.strictEqual(found.version, '1.0.0');

  const notFound = await registry.find('brainstorming', 'zed');
  assert.strictEqual(notFound, undefined);

  await fs.rm(tmpDir, { recursive: true });
});

test('InstalledSkillRegistry.findByName returns all entries with that name', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  const registry = new InstalledSkillRegistry(registryPath);

  await registry.add({ name: 'brainstorming', agent: 'claude', version: '1.0.0', scope: 'global', targetPath: '/a' });
  await registry.add({ name: 'brainstorming', agent: 'cursor', version: '1.0.0', scope: 'global', targetPath: '/b' });
  await registry.add({ name: 'other-skill',   agent: 'claude', version: '1.0.0', scope: 'global', targetPath: '/c' });

  const results = await registry.findByName('brainstorming');
  assert.strictEqual(results.length, 2);
  assert.ok(results.every(s => s.name === 'brainstorming'));

  const none = await registry.findByName('nonexistent');
  assert.deepStrictEqual(none, []);

  await fs.rm(tmpDir, { recursive: true });
});

test('updateSkill skips when source version matches installed version', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  const sourcePath = path.join(tmpDir, 'source');
  const targetPath = path.join(tmpDir, 'target');

  await fs.mkdir(sourcePath);
  await fs.writeFile(path.join(sourcePath, 'SKILL.md'),
    '---\nname: test-skill\nmetadata:\n  version: 1.0.0\n---\n# test');
  await fs.mkdir(targetPath);
  await fs.writeFile(path.join(targetPath, 'SKILL.md'),
    '---\nname: test-skill\nmetadata:\n  version: 1.0.0\n---\n# test');

  const registry = new InstalledSkillRegistry(registryPath);
  await registry.add({
    name: 'test-skill',
    agent: 'claude',
    version: '1.0.0',
    isHash: false,
    sourcePath,
    targetPath
  });

  const result = await updateSkill('test-skill', 'claude', registry);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skipped, true);
  assert.strictEqual(result.oldVersion, '1.0.0');
  assert.strictEqual(result.newVersion, '1.0.0');

  await fs.rm(tmpDir, { recursive: true });
});

test('updateSkill copies and updates registry when version changed', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  const sourcePath = path.join(tmpDir, 'source');
  const targetPath = path.join(tmpDir, 'target');

  await fs.mkdir(sourcePath);
  await fs.writeFile(path.join(sourcePath, 'SKILL.md'),
    '---\nname: test-skill\nmetadata:\n  version: 2.0.0\n---\n# test v2');
  await fs.mkdir(targetPath);
  await fs.writeFile(path.join(targetPath, 'SKILL.md'),
    '---\nname: test-skill\nmetadata:\n  version: 1.0.0\n---\n# test v1');

  const registry = new InstalledSkillRegistry(registryPath);
  await registry.add({
    name: 'test-skill',
    agent: 'claude',
    version: '1.0.0',
    isHash: false,
    sourcePath,
    targetPath
  });

  const result = await updateSkill('test-skill', 'claude', registry);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skipped, false);
  assert.strictEqual(result.oldVersion, '1.0.0');
  assert.strictEqual(result.newVersion, '2.0.0');

  const updated = await registry.find('test-skill', 'claude');
  assert.strictEqual(updated.version, '2.0.0');

  const targetContent = await fs.readFile(path.join(targetPath, 'SKILL.md'), 'utf-8');
  assert.ok(targetContent.includes('2.0.0'));

  await fs.rm(tmpDir, { recursive: true });
});

test('updateSkill returns failure when skill not in registry', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  const registry = new InstalledSkillRegistry(registryPath);

  const result = await updateSkill('nonexistent', 'claude', registry);

  assert.strictEqual(result.success, false);
  assert.ok(result.message.length > 0);

  await fs.rm(tmpDir, { recursive: true });
});

test('InstalledSkillRegistry.remove removes only the (name, agent) entry', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const registryPath = path.join(tmpDir, 'installed.json');
  const registry = new InstalledSkillRegistry(registryPath);

  await registry.add({ name: 'brainstorming', agent: 'claude', version: '1.0.0', scope: 'global', targetPath: '/a' });
  await registry.add({ name: 'brainstorming', agent: 'cursor', version: '1.0.0', scope: 'global', targetPath: '/b' });

  await registry.remove('brainstorming', 'claude');

  const remaining = await registry.load();
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].agent, 'cursor');

  await fs.rm(tmpDir, { recursive: true });
});
