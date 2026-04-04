/**
 * Tests for parseArgs function - CLI argument parsing
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('should parse install command with URL as subcommand', () => {
    const args = ['i', 'https://github.com/owner/repo'];
    const result = parseArgs(args);
    
    assert.strictEqual(result.command, 'i');
    assert.strictEqual(result.subcommand, 'https://github.com/owner/repo');
    assert.deepStrictEqual(result.positional, []);
  });

  it('should parse install command with full command', () => {
    const args = ['install', 'https://github.com/owner/repo'];
    const result = parseArgs(args);
    
    assert.strictEqual(result.command, 'install');
    assert.strictEqual(result.subcommand, 'https://github.com/owner/repo');
    assert.deepStrictEqual(result.positional, []);
  });

  it('should parse init command with name', () => {
    const args = ['init', 'my-skill'];
    const result = parseArgs(args);
    
    assert.strictEqual(result.command, 'init');
    assert.strictEqual(result.subcommand, 'my-skill');
    assert.deepStrictEqual(result.positional, []);
  });

  it('should parse init command without name', () => {
    const args = ['init'];
    const result = parseArgs(args);
    
    assert.strictEqual(result.command, 'init');
    assert.strictEqual(result.subcommand, null);
    assert.deepStrictEqual(result.positional, []);
  });

  it('should parse dry-run flag', () => {
    const args = ['install', './skill', '--dry-run'];
    const result = parseArgs(args);
    
    assert.strictEqual(result.command, 'install');
    assert.strictEqual(result.subcommand, './skill');
    assert.strictEqual(result.dryRun, true);
  });

  it('should parse init options', () => {
    const args = ['init', 'my-skill', '-v', '2.0.0', '-d', 'Description', '-a', 'Author'];
    const result = parseArgs(args);
    
    assert.strictEqual(result.command, 'init');
    assert.strictEqual(result.subcommand, 'my-skill');
    assert.strictEqual(result.initVersion, '2.0.0');
    assert.strictEqual(result.initDescription, 'Description');
    assert.strictEqual(result.initAuthor, 'Author');
  });
});
