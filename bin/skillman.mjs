#!/usr/bin/env node
/**
 * Skillman - AI Agent Skill Installer
 * 
 * A CLI tool to install AI agent skills across multiple platforms.
 */

import { cli } from '../src/cli.js';

cli().catch(err => {
  console.error(`\x1b[31m✗\x1b[0m ${err.message}`);
  process.exit(1);
});
