/**
 * CLI Entry Point
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { select, confirm, input, Separator } from '@inquirer/prompts';
import { scanSkills } from './scanner.js';
import { installSkill } from './installer.js';
import { loadAgents } from './config.js';
import { t } from './i18n.js';
import { loadHistory, addWorkspace } from './history.js';

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
  console.log(`${c.green}${t('app.name')}${c.reset} - ${t('app.description')}

${c.cyan}${t('help.usage')}:${c.reset}
  skillman                    ${t('help.cmd.interactive')}
  skillman install <path>     ${t('help.cmd.install')}
  skillman agents             ${t('help.cmd.agents')}

${c.cyan}${t('help.options')}:${c.reset}
  -n, --dry-run    ${t('help.opt.dry_run')}
  -v, --version    ${t('help.opt.version')}
  -h, --help       ${t('help.opt.help')}

${c.cyan}${t('help.examples')}:${c.reset}
  skillman                     # ${t('help.cmd.interactive')}
  skillman --dry-run           # ${t('help.opt.dry_run')}
  skillman install ./my-skill  # ${t('help.cmd.install')}
  skillman agents              # ${t('help.cmd.agents')}
`);
}

// Show version
function showVersion() {
  console.log(`${t('app.name').toLowerCase()} v${VERSION}`);
}

// List agents
async function listAgents() {
  const agents = await loadAgents();
  
  console.log(`\n${c.cyan}${t('msg.agent')}:${c.reset}\n`);
  
  for (const [name, agent] of Object.entries(agents)) {
    console.log(`  ${c.green}${agent.displayName}${c.reset} (${name})`);
    console.log(`    ${t('option.global')}:    ${c.gray}${agent.globalSkillsDir}${c.reset}`);
    console.log(`    ${t('option.workspace')}: ${c.gray}${agent.skillsDir}${c.reset}`);
    console.log();
  }
}

// Interactive install flow
async function interactiveInstall(dryRun) {
  console.log(`${c.green}${t('app.name')}${c.reset} - ${t('app.description')}${dryRun ? c.yellow + ' [DRY-RUN]' + c.reset : ''}\n`);

  // Step 1: Scan skills
  log.step(t('step.scan'));
  
  const skills = await scanSkills(process.cwd());
  if (skills.length === 0) {
    log.error(t('msg.no_skills'));
    process.exit(1);
  }

  log.success(t('msg.found_skills', { count: skills.length }));

  // Step 2: Select skill
  const skillChoices = skills.map(s => ({
    name: s.description 
      ? `${s.name} ${c.gray}(${s.description.slice(0, 40)}${s.description.length > 40 ? '...' : ''})${c.reset}`
      : s.name,
    value: s
  }));

  const selectedSkill = await select({
    message: t('step.select_skill') + ':',
    choices: skillChoices,
    pageSize: 10
  });

  log.success(`${t('msg.selected')}: ${selectedSkill.name}`);

  // Step 3: Select agent
  const agents = await loadAgents();
  const agentChoices = Object.values(agents).map(a => ({
    name: a.displayName,
    value: a
  }));

  const agent = await select({
    message: t('step.select_agent') + ':',
    choices: agentChoices,
    pageSize: 10
  });

  log.success(`${t('msg.agent')}: ${agent.displayName}`);

  // Step 4: Select scope
  const scope = await select({
    message: t('step.select_scope') + ':',
    choices: [
      { name: `${t('option.global')} ${c.gray}(${agent.globalSkillsDir})${c.reset}`, value: 'global' },
      { name: `${t('option.workspace')} ${c.gray}(${t('option.custom_path')})${c.reset}`, value: 'workspace' }
    ]
  });

  // Step 5: If workspace scope, ask for workspace path
  let workspacePath = agent.skillsDir;
  if (scope === 'workspace') {
    const history = await loadHistory(agent.name);
    
    let customPath;
    
    if (history.length > 0) {
      // Show history choices with separator
      const historyChoices = [
        ...history.map((h, idx) => ({
          name: `${idx + 1}. ${h}`,
          value: h
        })),
        new Separator(),
        { name: t('prompt.new_path'), value: '__NEW__' }
      ];
      
      const selected = await select({
        message: t('prompt.select_workspace') + ':',
        choices: historyChoices
      });
      
      if (selected === '__NEW__') {
        customPath = await input({
          message: t('prompt.workspace_path') + ':',
          default: process.cwd(),
          validate: (value) => {
            if (!value.trim()) return t('error.empty_path');
            return true;
          }
        });
      } else {
        customPath = selected;
      }
    } else {
      // No history, ask for input
      customPath = await input({
        message: t('prompt.workspace_path') + ':',
        default: process.cwd(),
        validate: (value) => {
          if (!value.trim()) return t('error.empty_path');
          return true;
        }
      });
    }
    
    // Save to history (with agent name)
    await addWorkspace(agent.name, customPath);
    
    // Extract relative skills directory from agent config
    const skillsRelDir = agent.skillsDir.includes(path.sep)
      ? agent.skillsDir.split(path.sep).slice(-2).join(path.sep)
      : agent.skillsDir;
    workspacePath = path.join(customPath.trim(), skillsRelDir);
    log.info(`${t('msg.workspace_dir')}: ${workspacePath}`);
  }

  // Step 6: Calculate target path
  const targetDir = scope === 'global'
    ? path.join(agent.globalSkillsDir, selectedSkill.name)
    : path.join(workspacePath, selectedSkill.name);

  // Dry-run preview
  if (dryRun) {
    log.step(t('step.preview'));
    log.dry(`${t('msg.source')}: ${selectedSkill.path}`);
    log.dry(`${t('msg.target')}: ${targetDir}`);
    
    try {
      await fs.access(targetDir);
      log.dry(t('msg.exists'));
    } catch {
      log.dry(t('msg.not_exists'));
    }
    
    log.dry(t('msg.copy'));
    
    console.log(`\n${c.yellow}📋 ${t('msg.preview_summary')}${c.reset}\n`);
    console.log(`  Skill:    ${selectedSkill.name}`);
    console.log(`  ${t('msg.agent')}:    ${agent.displayName}`);
    console.log(`  ${t('msg.scope')}:    ${scope}`);
    console.log(`  ${t('msg.location')}: ${targetDir}`);
    console.log(`\n${c.gray}${t('msg.dry_run_hint')}${c.reset}\n`);
    return;
  }

  // Step 6: Install
  log.step(t('step.install'));
  
  // Check if already exists
  try {
    await fs.access(targetDir);
    log.warn(t('msg.skill_exists'));
    const overwrite = await confirm({ message: t('prompt.overwrite') + '?', default: false });
    if (!overwrite) {
      log.info(t('msg.install_cancelled'));
      process.exit(0);
    }
  } catch {
    // Directory doesn't exist, proceed
  }

  // Install
  await installSkill(selectedSkill.path, targetDir);
  log.success(`${t('msg.target')}: ${targetDir}`);

  // Summary
  console.log(`\n${c.green}✨ ${t('msg.install_complete')}${c.reset}\n`);
  console.log(`  Skill:    ${selectedSkill.name}`);
  console.log(`  ${t('msg.agent')}:    ${agent.displayName}`);
  console.log(`  ${t('msg.scope')}:    ${scope}`);
  console.log(`  ${t('msg.location')}: ${targetDir}`);
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
    log.error(t('error.not_implemented'));
    process.exit(1);
  }

  // Default: interactive install
  await interactiveInstall(options.dryRun);
}
