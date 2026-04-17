/**
 * CLI Entry Point
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { select, confirm, input, Separator, checkbox } from '@inquirer/prompts';
import { skillCheckbox } from './skill-checkbox.js';
import pkg from '../package.json' with { type: 'json' };
import { scanSkills, parseSkillFile } from './scanner.js';
import { installSkill } from './installer.js';
import { loadAgents } from './config.js';
import { t } from './i18n.js';
import { loadHistory, addWorkspace, saveLastUsed } from './history.js';
import { downloadSkill, parseUrl, cleanupDownloads } from './downloader.js';
import { InstalledSkillRegistry, formatInstalledSkills, uninstallSkill, updateSkill } from './version.js';
import { formatVersion } from './hash.js';
import { desymlink, showDoctorHelp } from './doctor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION = pkg.version || '1.0.0';

// ASCII Art Logo
const LOGO = `
███████╗██╗  ██╗██╗██╗     ██╗     ███╗   ███╗ █████╗ ███╗   ██╗
██╔════╝██║ ██╔╝██║██║     ██║     ████╗ ████║██╔══██╗████╗  ██║
███████╗█████╔╝ ██║██║     ██║     ██╔████╔██║███████║██╔██╗ ██║
╚════██║██╔═██╗ ██║██║     ██║     ██║╚██╔╝██║██╔══██║██║╚██╗██║
███████║██║  ██╗██║███████╗███████╗██║ ╚═╝ ██║██║  ██║██║ ╚████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝
`;

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
export function parseArgs(args) {
  const result = {
    command: null,
    subcommand: null,
    dryRun: false,
    help: false,
    version: false,
    recursive: false,
    initVersion: '1.0.0',
    initDescription: '',
    initAuthor: '',
    initDir: true,
    positional: []
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run' || arg === '-n') {
      result.dryRun = true;
    } else if (arg === '--recursive' || arg === '-r') {
      result.recursive = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      // Check if next arg is a value (for init command)
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        result.initVersion = args[i + 1];
        i++;
      } else {
        result.version = true;
      }
    } else if (arg === '--description' || arg === '-d') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        result.initDescription = args[i + 1];
        i++;
      }
    } else if (arg === '--author' || arg === '-a') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        result.initAuthor = args[i + 1];
        i++;
      }
    } else if (arg === '--dir') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        result.initDir = args[i + 1].toLowerCase() !== 'false';
        i++;
      }
    } else if (!arg.startsWith('-')) {
      if (!result.command) {
        result.command = arg;
      } else if (!result.subcommand) {
        result.subcommand = arg;
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
  skillman init [name]        ${t('help.cmd.init')}
  skillman install <path>     ${t('help.cmd.install')}
  skillman i <path>           ${t('help.cmd.install')}
  skillman list               ${t('help.cmd.list')}
  skillman update <skill>     ${t('help.cmd.update')}
  skillman u <skill>          ${t('help.cmd.update')}
  skillman uninstall <skill>  ${t('help.cmd.uninstall')}
  skillman agents             ${t('help.cmd.agents')}
  skillman doctor <command>   ${t('help.doctor_title')}

${c.cyan}${t('help.options')}:${c.reset}
  -n, --dry-run    ${t('help.opt.dry_run')}
  -v, --version    ${t('help.opt.version')}
  -h, --help       ${t('help.opt.help')}

${c.cyan}${t('help.examples')}:${c.reset}
  skillman                     # ${t('help.cmd.interactive')}
  skillman init                # Create skill with default name
  skillman init my-skill       # Create skill with custom name
  skillman init -v 2.0.0       # Create skill with specific version
  skillman --dry-run           # ${t('help.opt.dry_run')}
  skillman install ./my-skill  # ${t('help.cmd.install')}
  skillman i github.com/owner/repo  # ${t('help.cmd.install')}
  skillman list                # ${t('help.cmd.list')}
  skillman update my-skill     # ${t('help.cmd.update')}
  skillman uninstall my-skill  # ${t('help.cmd.uninstall')}
  skillman agents              # ${t('help.cmd.agents')}
  skillman doctor desymlink    # ${t('help.cmd.doctor_desymlink')}
  skillman doctor help         # Show doctor commands
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

// Initialize a new skill template
export async function initSkill(skillName, options) {
  const name = skillName || 'my-skill';
  const version = options.initVersion || '1.0.0';
  const description = options.initDescription || '';
  const author = options.initAuthor || '';
  const createDir = options.initDir !== false;
  
  console.log(`${c.cyan}${LOGO}${c.reset}`);
  log.step(t('msg.init_skill') || 'Initializing skill template');
  
  const targetDir = createDir ? path.join(process.cwd(), name) : process.cwd();
  const skillFile = path.join(targetDir, 'SKILL.md');
  
  // Check if already exists
  try {
    await fs.access(skillFile);
    log.error(t('error.skill_exists') || 'SKILL.md already exists');
    process.exit(1);
  } catch {
    // File doesn't exist, proceed
  }
  
  // Create directory if needed
  if (createDir) {
    await fs.mkdir(targetDir, { recursive: true });
  }
  
  // Build metadata section
  let metadataSection = `metadata:\n  version: ${version}`;
  if (author) {
    metadataSection += `\n  author: ${author}`;
  }
  
  // Generate SKILL.md content
  const skillContent = `---
name: ${name}
description: ${description}
${metadataSection}
---

# ${name}

## Purpose

## Responsibilities

## Decision Rules

## Output Contract
`;
  
  await fs.writeFile(skillFile, skillContent);
  
  log.success(`${t('msg.created') || 'Created'}: ${skillFile}`);
  console.log(`\n${c.gray}${t('msg.init_hint') || 'Edit SKILL.md to customize your skill'}${c.reset}`);
}

// Install from URL or local path
async function installFromUrl(url, dryRun) {
  console.log(`${c.cyan}${LOGO}${c.reset}`);
  console.log(`${c.gray}${t('app.description')}${dryRun ? c.yellow + ' [DRY-RUN]' + c.reset : ''}\n`);

  const parsed = parseUrl(url);
  const isRemote = parsed.type !== 'local';

  // Step 1: Download/resolve path
  let sourcePath;
  if (isRemote) {
    log.step(t('msg.downloading') || 'Downloading...');
    try {
      sourcePath = await downloadSkill(url);
      log.success(t('msg.downloaded') || 'Downloaded');
    } catch (error) {
      log.error(error.message);
      process.exit(1);
    }
  } else {
    sourcePath = url;
  }

  // Step 2: Scan skills
  log.step(t('step.scan'));
  const skills = await scanSkills(sourcePath);
  
  if (skills.length === 0) {
    log.error(t('msg.no_skills'));
    process.exit(1);
  }

  log.success(t('msg.found_skills', { count: skills.length }));

  // Step 3: Select skills
  const selectedSkills = await selectSkills(skills);

  // Continue with rest of interactive flow, passing the original URL
  await continueInstallMultiple(selectedSkills, dryRun, isRemote ? url : null);

  // Cleanup temp downloads
  if (isRemote) {
    await cleanupDownloads();
  }
}

// Continue installation after skill selection (multiple skills)
async function continueInstallMultiple(selectedSkills, dryRun, sourceUrl = null) {
  // Load last used preferences
  const { lastAgent, lastScope } = await loadHistory();
  const agents = await loadAgents();
  
  // Step 4: Select agent (with default from history)
  const agentList = Object.values(agents);
  const defaultAgentIndex = lastAgent 
    ? agentList.findIndex(a => a.name === lastAgent)
    : -1;
  
  const agentChoices = agentList.map(a => ({
    name: a.displayName,
    value: a
  }));

  const agent = await select({
    message: t('step.select_agent') + ':',
    choices: agentChoices,
    pageSize: 10,
    default: defaultAgentIndex >= 0 ? agentChoices[defaultAgentIndex].value : undefined
  });

  log.success(`${t('msg.agent')}: ${agent.displayName}`);

  // Step 5: Select scope (with default from history)
  const scopeChoices = [
    { name: `${t('option.global')} ${c.gray}(${agent.globalSkillsDir})${c.reset}`, value: 'global' },
    { name: `${t('option.workspace')} ${c.gray}(${t('option.custom_path')})${c.reset}`, value: 'workspace' }
  ];
  
  const defaultScopeIndex = lastScope 
    ? scopeChoices.findIndex(s => s.value === lastScope)
    : -1;

  const scope = await select({
    message: t('step.select_scope') + ':',
    choices: scopeChoices,
    default: defaultScopeIndex >= 0 ? scopeChoices[defaultScopeIndex].value : undefined
  });

  // Save preferences for next time
  await saveLastUsed(agent.name, scope);

  // Step 6: If workspace scope, ask for workspace path
  let workspacePath = agent.skillsDir;
  if (scope === 'workspace') {
    const { workspaces } = await loadHistory(agent.name);
    
    let customPath;
    
    if (workspaces.length > 0) {
      // Show history choices with separator
      const historyChoices = [
        ...workspaces.map((h, idx) => ({
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

  // Dry-run preview for all skills
  if (dryRun) {
    log.step(t('step.preview'));
    
    for (const skill of selectedSkills) {
      const targetDir = scope === 'global'
        ? path.join(agent.globalSkillsDir, skill.name)
        : path.join(workspacePath, skill.name);
      
      log.dry(`\n${skill.name}:`);
      log.dry(`  ${t('msg.source')}: ${skill.path}`);
      log.dry(`  ${t('msg.target')}: ${targetDir}`);
      
      try {
        await fs.access(targetDir);
        log.dry(`  ${t('msg.exists')}`);
      } catch {
        log.dry(`  ${t('msg.not_exists')}`);
      }
    }
    
    console.log(`\n${c.yellow}📋 ${t('msg.preview_summary')}${c.reset}\n`);
    console.log(`  ${t('msg.selected_count', { count: selectedSkills.length })}`);
    console.log(`  ${t('msg.agent')}:    ${agent.displayName}`);
    console.log(`  ${t('msg.scope')}:    ${scope}`);
    console.log(`\n${c.gray}${t('msg.dry_run_hint')}${c.reset}\n`);
    return;
  }

  // Step 8: Install all skills
  log.step(t('step.install'));
  
  let installedCount = 0;
  let skippedCount = 0;
  
  for (const skill of selectedSkills) {
    const targetDir = scope === 'global'
      ? path.join(agent.globalSkillsDir, skill.name)
      : path.join(workspacePath, skill.name);
    
    log.step(`${t('msg.installing') || 'Installing'}: ${skill.name}`);
    
    // Check if already exists
    let shouldInstall = true;
    try {
      await fs.access(targetDir);
      // Get existing skill version
      const existingSkillFile = path.join(targetDir, 'SKILL.md');
      const existingSkill = await parseSkillFile(existingSkillFile);
      const currentVer = formatVersion(existingSkill?.version, existingSkill?.isHash) || '?';
      const newVer = formatVersion(skill.version, skill.isHash) || '?';
      log.warn(`${skill.name} ${t('msg.already_exists') || 'already exists'}`);
      console.log(`  ${c.gray}Current:${c.reset} ${currentVer}  ${c.gray}→${c.reset}  ${c.gray}Installing:${c.reset} ${newVer}`);
      const overwrite = await confirm({ message: t('prompt.overwrite') + '?', default: false });
      if (!overwrite) {
        log.info(t('msg.skipped') || 'Skipped');
        skippedCount++;
        shouldInstall = false;
      }
    } catch {
      // Directory doesn't exist, proceed
    }
    
    if (shouldInstall) {
      await installSkill(skill.path, targetDir, {
        name: skill.name,
        version: skill.version,
        isHash: skill.isHash,
        agent: agent.name,
        scope: scope,
        sourceUrl: sourceUrl
      });
      log.success(`${t('msg.target')}: ${targetDir}`);
      installedCount++;
    }
  }

  // Summary
  console.log(`\n${c.green}✨ ${t('msg.install_complete')}${c.reset}\n`);
  console.log(`  ${t('msg.installed') || 'Installed'}: ${installedCount}`);
  if (skippedCount > 0) {
    console.log(`  ${t('msg.skipped') || 'Skipped'}: ${skippedCount}`);
  }
  console.log(`  ${t('msg.agent')}:    ${agent.displayName}`);
  console.log(`  ${t('msg.scope')}:    ${scope}`);
  console.log();
}

// Helper: Select skills from list
async function selectSkills(skills, message = null) {
  if (skills.length === 1) {
    log.success(`${t('msg.selected')}: ${skills[0].name}`);
    return [skills[0]];
  }
  
  const skillChoices = skills.map(s => {
    const displayVersion = formatVersion(s.version, s.isHash);
    const versionStr = displayVersion ? `@${displayVersion}` : '';
    const descStr = s.description 
      ? ` ${c.gray}(${s.description.slice(0, 40)}${s.description.length > 40 ? '...' : ''})${c.reset}`
      : '';
    return {
      name: `${s.name}${versionStr}${descStr}`,
      value: s,
      description: s.description // Store full description for detail view
    };
  });

  const selectedSkills = await skillCheckbox({
    message: (message || t('step.select_skills')) + ':',
    choices: skillChoices,
    pageSize: 10,
    loop: false,
    validate: (selected) => {
      if (selected.length === 0) {
        return t('error.no_selection') || 'Please select at least one skill';
      }
      return true;
    }
  });

  log.success(`${t('msg.selected_count', { count: selectedSkills.length })}`);
  return selectedSkills;
}

// List installed skills
async function listSkills() {
  const registry = new InstalledSkillRegistry();
  const skills = await registry.load();
  
  console.log(`\n${c.cyan}${t('msg.installed_skills')}:${c.reset}\n`);
  
  const lines = formatInstalledSkills(skills, t);
  for (const line of lines) {
    console.log(line);
  }
}

// Uninstall a skill
async function uninstallCommand(skillName, dryRun) {
  if (!skillName) {
    log.error(t('error.no_skill_name') || 'Please specify a skill name');
    process.exit(1);
  }
  
  const registry = new InstalledSkillRegistry();
  const skill = await registry.find(skillName);
  
  if (!skill) {
    log.error(t('error.skill_not_installed'));
    process.exit(1);
  }
  
  if (dryRun) {
    log.dry(`${t('msg.uninstalling') || 'Would uninstall'}: ${skillName}`);
    log.dry(`  ${t('msg.target')}: ${skill.targetPath}`);
    return;
  }
  
  const confirmed = await confirm({ 
    message: `${t('prompt.uninstall')} ${skillName}?`, 
    default: false 
  });
  
  if (!confirmed) {
    log.info(t('msg.cancelled') || 'Cancelled');
    return;
  }
  
  const success = await uninstallSkill(skillName, registry);
  
  if (success) {
    log.success(`${t('msg.uninstalled')}: ${skillName}`);
  } else {
    log.error(t('error.unknown'));
    process.exit(1);
  }
}

// Update a skill
async function updateCommand(skillName, dryRun) {
  if (!skillName) {
    log.error(t('error.no_skill_name') || 'Please specify a skill name');
    process.exit(1);
  }
  
  const registry = new InstalledSkillRegistry();
  const skill = await registry.find(skillName);
  
  if (!skill) {
    log.error(t('error.skill_not_installed'));
    process.exit(1);
  }
  
  if (dryRun) {
    log.dry(`${t('msg.updating') || 'Would update'}: ${skillName}`);
    log.dry(`  ${t('msg.source')}: ${skill.sourcePath}`);
    log.dry(`  ${t('msg.target')}: ${skill.targetPath}`);
    return;
  }
  
  log.step(`${t('msg.updating') || 'Updating'}: ${skillName}`);
  
  const result = await updateSkill(skillName, registry);
  
  if (result.success) {
    log.success(`${t('msg.updated')}: ${skillName}`);
  } else {
    log.error(result.message);
    process.exit(1);
  }
}

// Interactive install flow
async function interactiveInstall(dryRun) {
  console.log(`${c.cyan}${LOGO}${c.reset}`);
  console.log(`${c.gray}${t('app.description')}${dryRun ? c.yellow + ' [DRY-RUN]' + c.reset : ''}\n`);

  // Step 1: Scan skills
  log.step(t('step.scan'));
  
  const skills = await scanSkills(process.cwd());
  if (skills.length === 0) {
    log.error(t('msg.no_skills'));
    process.exit(1);
  }

  log.success(t('msg.found_skills', { count: skills.length }));

  // Step 2: Select skills
  const selectedSkills = await selectSkills(skills);

  // Continue with agent selection and installation
  await continueInstallMultiple(selectedSkills, dryRun);
}

// Commands that should display the logo (interactive or complex operations)
const LOGO_COMMANDS = new Set(['init', 'install', 'i', 'update', 'u', 'uninstall', 'doctor']);

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

  // Show logo for interactive mode or complex commands
  const isInteractive = !options.command;
  const needsLogo = isInteractive || LOGO_COMMANDS.has(options.command);
  if (needsLogo) {
    console.log(`${c.cyan}${LOGO}${c.reset}`);
  }

  if (options.command === 'agents') {
    await listAgents();
    return;
  }

  if (options.command === 'init') {
    const skillName = options.subcommand || options.positional[0];
    await initSkill(skillName, options);
    return;
  }

  if (options.command === 'install' || options.command === 'i') {
    const url = options.subcommand || options.positional[0] || process.cwd();
    await installFromUrl(url, options.dryRun);
    return;
  }

  if (options.command === 'list') {
    await listSkills();
    return;
  }

  if (options.command === 'uninstall') {
    await uninstallCommand(options.subcommand, options.dryRun);
    return;
  }

  if (options.command === 'update' || options.command === 'u') {
    await updateCommand(options.subcommand, options.dryRun);
    return;
  }

  if (options.command === 'doctor') {
    if (options.subcommand === 'desymlink') {
      const targetPath = options.positional[0] || process.cwd();
      await desymlink(targetPath, options.recursive, options.dryRun);
    } else if (options.subcommand === 'help' || options.help) {
      showDoctorHelp();
    } else {
      showDoctorHelp();
    }
    return;
  }

  // Default: interactive install
  await interactiveInstall(options.dryRun);
}
