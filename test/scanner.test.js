/**
 * Tests for scanner.js - Skill directory scanning functionality
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { scanSkills } from '../src/scanner.js';

describe('scanSkills', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillman-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should find skills in root directory', async () => {
    await fs.mkdir(path.join(tempDir, 'my-skill'));
    await fs.writeFile(
      path.join(tempDir, 'my-skill', 'SKILL.md'),
      'name: my-skill\ndescription: My test skill\n'
    );

    const skills = await scanSkills(tempDir);
    
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].name, 'my-skill');
    assert.strictEqual(skills[0].path, path.join(tempDir, 'my-skill'));
  });

  it('should find skills in skills/ subdirectory', async () => {
    const skillsDir = path.join(tempDir, 'skills');
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.mkdir(path.join(skillsDir, 'sub-skill'));
    await fs.writeFile(
      path.join(skillsDir, 'sub-skill', 'SKILL.md'),
      'name: sub-skill\ndescription: Sub skill description\n'
    );

    const skills = await scanSkills(tempDir);
    
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].name, 'sub-skill');
  });

  it('should find multiple skills', async () => {
    await fs.mkdir(path.join(tempDir, 'skill-a'));
    await fs.writeFile(
      path.join(tempDir, 'skill-a', 'SKILL.md'),
      'name: skill-a\ndescription: Skill A\n'
    );
    await fs.mkdir(path.join(tempDir, 'skill-b'));
    await fs.writeFile(
      path.join(tempDir, 'skill-b', 'SKILL.md'),
      'name: skill-b\ndescription: Skill B\n'
    );

    const skills = await scanSkills(tempDir);
    
    assert.strictEqual(skills.length, 2);
    const names = skills.map(s => s.name).sort();
    assert.deepStrictEqual(names, ['skill-a', 'skill-b']);
  });

  it('should return empty array when no skills found', async () => {
    const skills = await scanSkills(tempDir);
    assert.strictEqual(skills.length, 0);
  });

  it('should ignore directories without SKILL.md', async () => {
    await fs.mkdir(path.join(tempDir, 'not-a-skill'));
    await fs.writeFile(path.join(tempDir, 'not-a-skill', 'README.md'), '# Not a skill');

    const skills = await scanSkills(tempDir);
    assert.strictEqual(skills.length, 0);
  });

  it('should ignore directories with invalid SKILL.md', async () => {
    await fs.mkdir(path.join(tempDir, 'invalid-skill'));
    await fs.writeFile(
      path.join(tempDir, 'invalid-skill', 'SKILL.md'),
      '# Invalid Skill\nNo name field here\n'
    );

    const skills = await scanSkills(tempDir);
    assert.strictEqual(skills.length, 0);
  });

  it('should extract description from SKILL.md', async () => {
    await fs.mkdir(path.join(tempDir, 'desc-skill'));
    await fs.writeFile(
      path.join(tempDir, 'desc-skill', 'SKILL.md'),
      'name: desc-skill\ndescription: This is a test description.\n'
    );

    const skills = await scanSkills(tempDir);
    
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].description, 'This is a test description.');
  });

  it('should handle YAML multiline description with >-', async () => {
    await fs.mkdir(path.join(tempDir, 'multiline-skill'));
    await fs.writeFile(
      path.join(tempDir, 'multiline-skill', 'SKILL.md'),
      `name: multiline-skill
description: >-
  This is the actual description
  that spans multiple lines.
metadata:
  version: 1.0.0
`
    );

    const skills = await scanSkills(tempDir);
    
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].description, 'This is the actual description');
  });

  it('should handle YAML multiline description with |', async () => {
    await fs.mkdir(path.join(tempDir, 'pipe-skill'));
    await fs.writeFile(
      path.join(tempDir, 'pipe-skill', 'SKILL.md'),
      `name: pipe-skill
description: |
  First line of description
  Second line here
`
    );

    const skills = await scanSkills(tempDir);
    
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].description, 'First line of description');
  });
});
