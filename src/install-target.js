/**
 * Install target helpers
 * Shared logic for validating and reusing install destinations.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Extract the relative skills directory for a target agent.
 * @param {Object} agent
 * @param {string} agent.skillsDir
 * @returns {string}
 */
export function getSkillsRelativeDir(agent) {
  const segments = agent.skillsDir.split(/[\\/]/).filter(Boolean);

  if (segments.length <= 1) {
    return agent.skillsDir;
  }

  return path.join(...segments.slice(-2));
}

/**
 * Resolve the install root for the current install target.
 * @param {Object} agent
 * @param {string} agent.globalSkillsDir
 * @param {string} scope
 * @param {string|null} workspaceRoot
 * @returns {string}
 */
export function resolveInstallRoot(agent, scope, workspaceRoot) {
  if (scope === 'global') {
    return agent.globalSkillsDir;
  }

  return path.join(workspaceRoot, getSkillsRelativeDir(agent));
}

/**
 * Validate a saved install target before offering reuse.
 * @param {Object|null} lastInstallTarget
 * @param {Record<string, Object>} agents
 * @returns {Promise<Object|null>}
 */
export async function validateLastInstallTarget(lastInstallTarget, agents) {
  if (!lastInstallTarget) {
    return null;
  }

  const agent = agents[lastInstallTarget.agent];
  if (!agent) {
    return null;
  }

  if (!['global', 'workspace'].includes(lastInstallTarget.scope)) {
    return null;
  }

  if (lastInstallTarget.scope === 'global') {
    return {
      agent: lastInstallTarget.agent,
      scope: 'global',
      workspaceRoot: null
    };
  }

  if (typeof lastInstallTarget.workspaceRoot !== 'string' || !lastInstallTarget.workspaceRoot.trim()) {
    return null;
  }

  const workspaceRoot = path.resolve(lastInstallTarget.workspaceRoot);

  try {
    await fs.access(workspaceRoot);
    return {
      agent: lastInstallTarget.agent,
      scope: 'workspace',
      workspaceRoot
    };
  } catch {
    return null;
  }
}

/**
 * Format the reusable-target menu label.
 * @param {Object} lastInstallTarget
 * @param {Record<string, Object>} agents
 * @param {Function} t
 * @returns {string}
 */
export function formatLastInstallTargetChoice(lastInstallTarget, agents, t) {
  const agent = agents[lastInstallTarget.agent];
  const scopeLabel = t(`option.${lastInstallTarget.scope}`);
  const location = lastInstallTarget.scope === 'global'
    ? agent.globalSkillsDir
    : lastInstallTarget.workspaceRoot;

  return `${t('option.last_install_target')} (${agent.displayName} / ${scopeLabel} / ${location})`;
}

/**
 * Persist the last install target when installation succeeds.
 * @param {Object} params
 * @param {boolean} params.dryRun
 * @param {number} params.installedCount
 * @param {Object} params.agent
 * @param {string} params.scope
 * @param {string|null} params.workspaceRoot
 * @param {Function} params.saveLastInstallTarget
 * @returns {Promise<boolean>}
 */
export async function persistLastInstallTargetIfNeeded({
  dryRun,
  installedCount,
  agent,
  scope,
  workspaceRoot,
  saveLastInstallTarget
}) {
  if (dryRun || installedCount <= 0) {
    return false;
  }

  await saveLastInstallTarget({
    agent: agent.name,
    scope,
    workspaceRoot: scope === 'workspace' ? workspaceRoot : null
  });

  return true;
}
