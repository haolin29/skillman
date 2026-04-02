/**
 * CLI Entry Point
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { select, confirm } from '@inquirer/prompts';
import { scanSkills } from './scanner.js';
import { installSkill } from './installer.js';
import { loadAgents } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '1.0.0';

// ANSI colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${c.blue}ℹ${c.reset} ${msg}`),
  success: (msg) => console.log(`${c.green}✓${c.reset} ${msg}`),
  warn: (msg) => console.log(`${c.yellow}⚠${c.reset} ${msg}`),
  error: (msg) => console.log(`${c.red}✗${c.reset} ${msg}`),
  step: (msg) => console.log(`\n${c.blue}▶${c.reset} ${msg}`),
  dry: (msg) => console.log(`${c.yellow}[DRY-RUN]${c.reset} ${msg}`)
};

// Parse CLI arguments
function parseArgs(args) {
  const result = {
    command: null,
    dryRun: false,
    help: false,
    version: false,
    positional: []
  };

  for (const arg of args) {
    if (arg === '--dry-run' || arg === '-n') {
      result.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (!arg.startsWith('-')) {
      if (!result.command) {
        result.command = arg;
      } else {
        result.positional.push(arg);
      }
    }
  }

  return result;
}

// Show help
function showHelp() {
  console.log(`${c.green}Skillman${c.reset} - AI Agent Skill Installer

${c.cyan}Usage:${c.reset}
  skillman                    Interactive install (scan current directory)
  skillman install <path>     Install skill from path
  skillman agents             List available agents

${c.cyan}Options:${c.reset}
  -n, --dry-run    Preview installation without making changes
  -v, --version    Show version number
  -h, --help       Show this help message

${c.cyan}Examples:${c.reset}
  skillman                     # Interactive mode
  skillman --dry-run           # Preview installation
  skillman install ./my-skill  # Install specific skill
  skillman agents              # List agents
`);
}

// Show version
function showVersion() {
  console.log(`skillman v${VERSION}`);
}

// List agents
async function listAgents() {
  const agents = await loadAgents();
  
  console.log(`\n${c.cyan}Available Agents:${c.reset}\n`);
  
  for (const [name, agent] of Object.entries(agents)) {
    console.log(`  ${c.green}${agent.displayName}${c.reset} (${name})`);
    console.log(`    global:    ${c.gray}${agent.globalSkillsDir}${c.reset}`);
    console.log(`    workspace: ${c.gray}${agent.skillsDir}${c.reset}`);
    console.log();
  }
}

// Interactive install flow
async function interactiveInstall(dryRun) {
  console.log(`${c.green}Skillman${c.reset} - AI Agent Skill Installer${dryRun ? c.yellow + ' [DRY-RUN]' + c.reset : ''}\n`);

  // Step 1: Scan skills
  log.step('扫描可安装的 Skills...');
  
  const skills = await scanSkills(process.cwd());
  if (skills.length === 0) {
    log.error('当前目录未找到任何 skill (需要包含 SKILL.md 的文件夹)');
    process.exit(1);
  }

  log.success(`找到 ${skills.length} 个 skill`);

  // Step 2: Select skill
  const skillChoices = skills.map(s => ({
    name: s.description 
      ? `${s.name} ${c.gray}(${s.description.slice(0, 40)}${s.description.length > 40 ? '...' : ''})${c.reset}`
      : s.name,
    value: s
  }));

  const selectedSkill = await select({
    message: '选择要安装的 Skill:',
    choices: skillChoices,
    pageSize: 10
  });

  log.success(`选择: ${selectedSkill.name}`);

  // Step 3: Select agent
  const agents = await loadAgents();
  const agentChoices = Object.values(agents).map(a => ({
    name: a.displayName,
    value: a
  }));

  const agent = await select({
    message: '选择目标 Agent:',
    choices: agentChoices,
    pageSize: 10
  });

  log.success(`Agent: ${agent.displayName}`);

  // Step 4: Select scope
  const scope = await select({
    message: '选择安装范围:',
    choices: [
      { name: `global ${c.gray}(${agent.globalSkillsDir})${c.reset}`, value: 'global' },
      { name: `workspace ${c.gray}(${agent.skillsDir})${c.reset}`, value: 'workspace' }
    ]
  });

  // Step 5: Calculate target path
  const targetDir = scope === 'global'
    ? path.join(agent.globalSkillsDir, selectedSkill.name)
    : path.join(agent.skillsDir, selectedSkill.name);

  // Dry-run preview
  if (dryRun) {
    log.step('预览安装...');
    log.dry(`源目录: ${selectedSkill.path}`);
    log.dry(`目标目录: ${targetDir}`);
    
    try {
      await fs.access(targetDir);
      log.dry('目标已存在，将覆盖');
    } catch {
      log.dry('目标不存在，将创建');
    }
    
    log.dry('将复制 skill 文件夹到目标位置');
    
    console.log(`\n${c.yellow}📋 预览摘要${c.reset}\n`);
    console.log(`  Skill:    ${selectedSkill.name}`);
    console.log(`  Agent:    ${agent.displayName}`);
    console.log(`  Scope:    ${scope}`);
    console.log(`  Location: ${targetDir}`);
    console.log(`\n${c.gray}使用 --dry-run 预览，未执行任何操作${c.reset}\n`);
    return;
  }

  // Step 6: Install
  log.step('开始安装...');
  
  // Check if already exists
  try {
    await fs.access(targetDir);
    log.warn('该 skill 已存在');
    const overwrite = await confirm({ message: '是否覆盖?', default: false });
    if (!overwrite) {
      log.info('安装已取消');
      process.exit(0);
    }
  } catch {
    // Directory doesn't exist, proceed
  }

  // Install
  await installSkill(selectedSkill.path, targetDir);
  log.success(`已复制到: ${targetDir}`);

  // Summary
  console.log(`\n${c.green}✨ 安装完成!${c.reset}\n`);
  console.log(`  Skill:    ${selectedSkill.name}`);
  console.log(`  Agent:    ${agent.displayName}`);
  console.log(`  Scope:    ${scope}`);
  console.log(`  Location: ${targetDir}`);
  console.log();
}

// Main CLI function
export async function cli() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  if (options.version) {
    showVersion();
    return;
  }

  if (options.command === 'agents') {
    await listAgents();
    return;
  }

  if (options.command === 'install') {
    log.error('install 命令尚未实现，请使用交互模式');
    process.exit(1);
  }

  // Default: interactive install
  await interactiveInstall(options.dryRun);
}
