/**
 * Tests for downloader.js - URL parsing and download functionality
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseUrl } from '../src/downloader.js';

describe('parseUrl', () => {
  describe('GitHub shorthand', () => {
    it('should parse owner/repo format', () => {
      const result = parseUrl('owner/repo');
      assert.strictEqual(result.type, 'github');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
      assert.strictEqual(result.subPath, null);
    });

    it('should parse owner/repo/sub/path format', () => {
      const result = parseUrl('owner/repo/skills/my-skill');
      assert.strictEqual(result.type, 'github');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
      assert.strictEqual(result.subPath, 'skills/my-skill');
    });
  });

  describe('Full GitHub URLs', () => {
    it('should parse https://github.com/owner/repo.git', () => {
      const result = parseUrl('https://github.com/owner/repo.git');
      assert.strictEqual(result.type, 'git');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
    });

    it('should parse GitHub URL with tree path', () => {
      const result = parseUrl('https://github.com/owner/repo/tree/main/skills/my-skill');
      assert.strictEqual(result.type, 'github');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
      assert.strictEqual(result.subPath, 'skills/my-skill');
    });
  });

  describe('SSH URLs', () => {
    it('should parse git@github.com:owner/repo.git', () => {
      const result = parseUrl('git@github.com:owner/repo.git');
      assert.strictEqual(result.type, 'git');
      assert.strictEqual(result.url, 'git@github.com:owner/repo.git');
    });

    it('should parse ssh:// URLs', () => {
      const result = parseUrl('ssh://git@bitbucket.example.com:7999/project/repo.git');
      assert.strictEqual(result.type, 'git');
      assert.strictEqual(result.url, 'ssh://git@bitbucket.example.com:7999/project/repo.git');
    });
  });

  describe('Local paths', () => {
    it('should treat absolute path as local', () => {
      const result = parseUrl('/home/user/skills/my-skill');
      assert.strictEqual(result.type, 'local');
      assert.strictEqual(result.url, '/home/user/skills/my-skill');
    });

    it('should treat relative path as local', () => {
      const result = parseUrl('./skills/my-skill');
      assert.strictEqual(result.type, 'local');
      assert.strictEqual(result.url, './skills/my-skill');
    });

    it('should treat Windows path as local', () => {
      const result = parseUrl('C:\\Users\\user\\skills\\my-skill');
      assert.strictEqual(result.type, 'local');
    });
  });

  describe('Edge cases', () => {
    it('should handle URL without .git suffix', () => {
      const result = parseUrl('https://github.com/owner/repo');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
    });

    it('should handle http:// URLs', () => {
      const result = parseUrl('http://github.com/owner/repo.git');
      assert.strictEqual(result.type, 'git');
    });
  });

  describe('Git ref support (tag/commit)', () => {
    it('should parse GitHub shorthand with tag', () => {
      const result = parseUrl('owner/repo@v1.0.0');
      assert.strictEqual(result.type, 'github');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
      assert.strictEqual(result.ref, 'v1.0.0');
    });

    it('should parse GitHub shorthand with commit hash', () => {
      const result = parseUrl('owner/repo@abc1234');
      assert.strictEqual(result.type, 'github');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
      assert.strictEqual(result.ref, 'abc1234');
    });

    it('should parse full URL with tag', () => {
      const result = parseUrl('https://github.com/owner/repo.git@v2.0.0');
      assert.strictEqual(result.type, 'git');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
      assert.strictEqual(result.ref, 'v2.0.0');
    });

    it('should parse SSH URL with tag', () => {
      const result = parseUrl('git@github.com:owner/repo.git@main');
      assert.strictEqual(result.type, 'git');
      assert.strictEqual(result.url, 'git@github.com:owner/repo.git');
      assert.strictEqual(result.ref, 'main');
    });

    it('should parse URL without ref', () => {
      const result = parseUrl('owner/repo');
      assert.strictEqual(result.type, 'github');
      assert.strictEqual(result.ref, null);
    });

    it('should parse GitHub shorthand with subpath and tag', () => {
      const result = parseUrl('owner/repo/skills/my-skill@v1.0.0');
      assert.strictEqual(result.type, 'github');
      assert.strictEqual(result.url, 'https://github.com/owner/repo.git');
      assert.strictEqual(result.subPath, 'skills/my-skill');
      assert.strictEqual(result.ref, 'v1.0.0');
    });
  });
});
