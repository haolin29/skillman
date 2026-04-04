import { test } from 'node:test';
import assert from 'node:assert';
import { scanSkills } from '../src/scanner.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

test('scanner should parse version from SKILL.md metadata', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const skillDir = path.join(tmpDir, 'test-skill');
  await fs.mkdir(skillDir, { recursive: true });
  
  const skillMd = `---
name: test-skill
description: A test skill
metadata:
  version: 1.2.3
---

# Test Skill
`;
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMd);
  
  const skills = await scanSkills(tmpDir);
  
  assert.strictEqual(skills.length, 1);
  assert.strictEqual(skills[0].name, 'test-skill');
  assert.strictEqual(skills[0].version, '1.2.3');
  
  // Cleanup
  await fs.rm(tmpDir, { recursive: true });
});

test('scanner should handle missing version gracefully', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  const skillDir = path.join(tmpDir, 'test-skill');
  await fs.mkdir(skillDir, { recursive: true });
  
  const skillMd = `---
name: test-skill
description: A test skill
metadata:
  author: test
---

# Test Skill
`;
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMd);
  
  const skills = await scanSkills(tmpDir);
  
  assert.strictEqual(skills.length, 1);
  assert.strictEqual(skills[0].name, 'test-skill');
  assert.strictEqual(skills[0].version, undefined);
  
  // Cleanup
  await fs.rm(tmpDir, { recursive: true });
});
