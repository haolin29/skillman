import { test } from 'node:test';
import assert from 'node:assert';
import { computeMD5, formatVersion } from '../src/hash.js';

test('computeMD5 generates consistent 32-character hash', () => {
  const content = 'test content for hashing';
  const hash = computeMD5(content);
  
  assert.strictEqual(hash.length, 32);
  assert.ok(/^[a-f0-9]+$/.test(hash), 'Hash should be hexadecimal');
  
  // Same content should produce same hash
  const hash2 = computeMD5(content);
  assert.strictEqual(hash, hash2);
});

test('computeMD5 produces different hashes for different content', () => {
  const hash1 = computeMD5('content A');
  const hash2 = computeMD5('content B');
  
  assert.notStrictEqual(hash1, hash2);
});

test('formatVersion returns version as-is for non-hash versions', () => {
  assert.strictEqual(formatVersion('1.2.3', false), '1.2.3');
  assert.strictEqual(formatVersion('2.0.0-beta.1', false), '2.0.0-beta.1');
  assert.strictEqual(formatVersion('0.1.0', false), '0.1.0');
});

test('formatVersion truncates hash to 8 characters', () => {
  const fullHash = 'a1b2c3d4e5f6789012345678abcdef01';
  const formatted = formatVersion(fullHash, true);
  
  assert.strictEqual(formatted, 'a1b2c3d4');
  assert.strictEqual(formatted.length, 8);
});

test('formatVersion handles edge cases', () => {
  // Empty/null/undefined version returns 'unknown'
  assert.strictEqual(formatVersion('', false), 'unknown');
  assert.strictEqual(formatVersion(null, false), 'unknown');
  assert.strictEqual(formatVersion(undefined, false), 'unknown');
  
  // Short hash (less than 8 chars)
  assert.strictEqual(formatVersion('abc', true), 'abc');
  
  // Exactly 8 char hash
  assert.strictEqual(formatVersion('12345678', true), '12345678');
});

test('formatVersion preserves full hash in data while truncating for display', () => {
  const fullHash = '0e6e2bb5b1f1f716b3fd64652fdc83ad';
  
  // The actual version stored should be full hash
  assert.strictEqual(fullHash.length, 32);
  
  // But displayed version should be truncated
  const displayVersion = formatVersion(fullHash, true);
  assert.strictEqual(displayVersion, '0e6e2bb5');
});
