/**
 * Doctor module - Diagnostic and repair utilities
 */

import fs from 'fs/promises';
import path from 'path';
import { t } from './i18n.js';

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

/**
 * Find all symlinks in a directory
 * @param {string} targetPath - Directory to scan
 * @param {boolean} recursive - Whether to scan recursively
 * @returns {Promise<Array<{path: string, target: string, isDirectory: boolean}>>}
 */
async function findSymlinks(targetPath, recursive = false) {
  const symlinks = [];
  
  async function scanDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isSymbolicLink()) {
        try {
          const linkTarget = await fs.readlink(fullPath);
          const resolvedTarget = path.resolve(path.dirname(fullPath), linkTarget);
          const isDirectory = await fs.stat(resolvedTarget).then(s => s.isDirectory()).catch(() => false);
          
          symlinks.push({
            path: fullPath,
            target: resolvedTarget,
            isDirectory,
            relativeTarget: linkTarget
          });
        } catch (error) {
          // Broken symlink
          symlinks.push({
            path: fullPath,
            target: linkTarget,
            isDirectory: false,
            broken: true,
            relativeTarget: linkTarget
          });
        }
      } else if (recursive && entry.isDirectory()) {
        await scanDir(fullPath);
      }
    }
  }
  
  await scanDir(targetPath);
  return symlinks;
}

/**
 * Convert a symlink to its target content (file or directory)
 * @param {string} linkPath - Path to the symlink
 * @param {string} targetPath - Path to the target
 * @param {boolean} isDirectory - Whether target is a directory
 * @param {boolean} dryRun - If true, only preview changes
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function convertSymlink(linkPath, targetPath, isDirectory, dryRun = false) {
  const tempPath = `${linkPath}.tmp.${process.pid}`;
  
  try {
    // Check if target exists
    try {
      await fs.access(targetPath);
    } catch {
      return { success: false, message: 'target_not_found' };
    }
    
    if (dryRun) {
      const type = isDirectory ? 'directory' : 'file';
      return { success: true, message: `would_convert_${type}` };
    }
    
    if (isDirectory) {
      // Copy directory to temp location
      await fs.cp(targetPath, tempPath, { recursive: true, force: true });
      // Remove symlink
      await fs.unlink(linkPath);
      // Move temp to final location
      await fs.rename(tempPath, linkPath);
    } else {
      // Copy file to temp location
      await fs.copyFile(targetPath, tempPath);
      // Replace symlink with file
      await fs.rename(tempPath, linkPath);
    }
    
    return { success: true, message: 'converted' };
  } catch (error) {
    // Cleanup temp on error
    try {
      await fs.rm(tempPath, { recursive: true, force: true });
    } catch {}
    return { success: false, message: error.message };
  }
}

/**
 * Convert all symlinks in a directory to their target content
 * @param {string} targetPath - Directory to process (default: current directory)
 * @param {boolean} recursive - Whether to process recursively
 * @param {boolean} dryRun - If true, only preview changes
 */
export async function desymlink(targetPath = process.cwd(), recursive = false, dryRun = false) {
  const resolvedPath = path.resolve(targetPath);
  
  log.step(t('msg.doctor_desymlink_scan') || 'Scanning for symlinks...');
  
  const symlinks = await findSymlinks(resolvedPath, recursive);
  
  if (symlinks.length === 0) {
    log.info(t('msg.doctor_no_symlinks') || 'No symlinks found');
    return;
  }
  
  log.success(t('msg.doctor_found_symlinks', { count: symlinks.length }) || `Found ${symlinks.length} symlink(s)`);
  
  // Show preview
  console.log();
  for (const link of symlinks) {
    const type = link.broken ? 'broken' : (link.isDirectory ? 'directory' : 'file');
    const typeLabel = type === 'broken' 
      ? (t('msg.doctor_broken') || 'broken')
      : (type === 'directory' 
        ? (t('msg.doctor_directory') || 'directory')
        : (t('msg.doctor_file') || 'file'));
    
    if (link.broken) {
      console.log(`  ${c.yellow}⚠${c.reset} ${path.relative(resolvedPath, link.path)} ${c.gray}(${typeLabel})${c.reset}`);
    } else {
      console.log(`  ${c.blue}→${c.reset} ${path.relative(resolvedPath, link.path)} ${c.gray}(${typeLabel})${c.reset}`);
    }
  }
  
  if (dryRun) {
    console.log();
    log.dry(t('msg.doctor_dry_run_hint') || 'Dry-run mode: no changes will be made');
    return;
  }
  
  // Process symlinks
  log.step(t('msg.doctor_converting') || 'Converting symlinks...');
  
  let converted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const link of symlinks) {
    const relativePath = path.relative(resolvedPath, link.path);
    
    if (link.broken) {
      log.warn(`${relativePath} - ${t('msg.doctor_skipped_broken') || 'skipped (broken symlink)'}`);
      skipped++;
      continue;
    }
    
    const result = await convertSymlink(link.path, link.target, link.isDirectory, dryRun);
    
    if (result.success) {
      const type = link.isDirectory 
        ? (t('msg.doctor_directory') || 'directory')
        : (t('msg.doctor_file') || 'file');
      log.success(`${relativePath} - ${t('msg.doctor_converted_to') || 'converted to'} ${type}`);
      converted++;
    } else {
      log.error(`${relativePath} - ${result.message}`);
      errors++;
    }
  }
  
  // Summary
  console.log();
  console.log(`${c.cyan}========== ${t('msg.doctor_summary') || 'Summary'} ==========${c.reset}`);
  console.log(`  ${c.green}${t('msg.doctor_converted') || 'Converted'}: ${converted}${c.reset}`);
  if (skipped > 0) {
    console.log(`  ${c.yellow}${t('msg.doctor_skipped') || 'Skipped'}: ${skipped}${c.reset}`);
  }
  if (errors > 0) {
    console.log(`  ${c.red}${t('msg.doctor_errors') || 'Errors'}: ${errors}${c.reset}`);
  }
  console.log();
}

/**
 * Show doctor help
 */
export function showDoctorHelp() {
  console.log(`${c.cyan}${t('help.doctor_title') || 'Doctor Commands'}:${c.reset}

  ${c.green}desymlink${c.reset} [path]    ${t('help.cmd.doctor_desymlink') || 'Convert symlinks to real files/directories'}

${c.cyan}${t('help.doctor_options') || 'Options'}:${c.reset}
  -r, --recursive    ${t('help.opt.recursive') || 'Process subdirectories recursively'}
  -n, --dry-run      ${t('help.opt.dry_run')}

${c.cyan}${t('help.examples')}:${c.reset}
  skillman doctor desymlink              # Convert symlinks in current directory
  skillman doctor desymlink ./skills     # Convert symlinks in specific directory
  skillman doctor desymlink -r           # Convert recursively
  skillman doctor desymlink -n           # Preview changes only
`);
}
