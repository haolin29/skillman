/**
 * Internationalization (i18n) module
 * Supports Chinese (zh) and English (en)
 */

import { execSync } from 'child_process';

// Detect system language
function detectLanguage() {
  try {
    const locale = process.env.LANG || 
                   process.env.LC_ALL || 
                   process.env.LC_MESSAGES ||
                   execSync('defaults read -g AppleLanguages 2>/dev/null || echo "en"', { encoding: 'utf8' }).trim();
    
    if (locale.toLowerCase().includes('zh')) {
      return 'zh';
    }
  } catch {
    // Fallback to English on error
  }
  return 'en';
}

const lang = detectLanguage();

const translations = {
  zh: {
    // Common
    'app.name': 'Skillman',
    'app.description': 'AI Agent Skill 安装器',
    'version': '版本',
    
    // Steps
    'step.scan': '扫描可安装的 Skills...',
    'step.select_skill': '选择要安装的 Skill',
    'step.select_agent': '选择目标 Agent',
    'step.select_scope': '选择安装范围',
    'step.install': '开始安装...',
    'step.preview': '预览安装...',
    
    // Messages
    'msg.found_skills': '找到 {count} 个 skill',
    'msg.no_skills': '当前目录未找到任何 skill (需要包含 SKILL.md 的文件夹)',
    'msg.selected': '选择',
    'msg.agent': 'Agent',
    'msg.scope': '范围',
    'msg.location': '位置',
    'msg.source': '源目录',
    'msg.target': '目标目录',
    'msg.exists': '目标已存在，将覆盖',
    'msg.not_exists': '目标不存在，将创建',
    'msg.copy': '将复制 skill 文件夹到目标位置',
    'msg.workspace_dir': 'Workspace skills 目录',
    'msg.install_complete': '安装完成!',
    'msg.preview_summary': '预览摘要',
    'msg.dry_run_hint': '使用 --dry-run 预览，未执行任何操作',
    'msg.skill_exists': '该 skill 已存在',
    'msg.install_cancelled': '安装已取消',
    
    // Prompts
    'prompt.workspace_path': '输入 Workspace 路径',
    'prompt.overwrite': '是否覆盖',
    'prompt.select_workspace': '选择 Workspace 路径',
    'prompt.new_path': '输入新路径...',
    
    // Options
    'option.global': '全局',
    'option.workspace': '工作区',
    'option.custom_path': '自定义路径',
    
    // Errors
    'error.empty_path': '路径不能为空',
    'error.not_implemented': '该命令尚未实现，请使用交互模式',
    
    // Help
    'help.usage': '用法',
    'help.options': '选项',
    'help.examples': '示例',
    'help.cmd.interactive': '交互式安装 (扫描当前目录)',
    'help.cmd.install': '从指定路径安装 skill',
    'help.cmd.agents': '列出可用的 agents',
    'help.opt.dry_run': '预览安装而不执行更改',
    'help.opt.version': '显示版本号',
    'help.opt.help': '显示帮助信息',
  },
  
  en: {
    // Common
    'app.name': 'Skillman',
    'app.description': 'AI Agent Skill Installer',
    'version': 'Version',
    
    // Steps
    'step.scan': 'Scanning available skills...',
    'step.select_skill': 'Select skill to install',
    'step.select_agent': 'Select target agent',
    'step.select_scope': 'Select installation scope',
    'step.install': 'Starting installation...',
    'step.preview': 'Previewing installation...',
    
    // Messages
    'msg.found_skills': 'Found {count} skill(s)',
    'msg.no_skills': 'No skills found in current directory (folders with SKILL.md required)',
    'msg.selected': 'Selected',
    'msg.agent': 'Agent',
    'msg.scope': 'Scope',
    'msg.location': 'Location',
    'msg.source': 'Source',
    'msg.target': 'Target',
    'msg.exists': 'Target exists, will overwrite',
    'msg.not_exists': 'Target does not exist, will create',
    'msg.copy': 'Will copy skill folder to target location',
    'msg.workspace_dir': 'Workspace skills directory',
    'msg.install_complete': 'Installation complete!',
    'msg.preview_summary': 'Preview Summary',
    'msg.dry_run_hint': 'Running with --dry-run, no changes made',
    'msg.skill_exists': 'Skill already exists',
    'msg.install_cancelled': 'Installation cancelled',
    
    // Prompts
    'prompt.workspace_path': 'Enter workspace path',
    'prompt.overwrite': 'Overwrite existing',
    'prompt.select_workspace': 'Select workspace path',
    'prompt.new_path': 'Enter new path...',
    
    // Options
    'option.global': 'Global',
    'option.workspace': 'Workspace',
    'option.custom_path': 'Custom path',
    
    // Errors
    'error.empty_path': 'Path cannot be empty',
    'error.not_implemented': 'Command not implemented, use interactive mode',
    
    // Help
    'help.usage': 'Usage',
    'help.options': 'Options',
    'help.examples': 'Examples',
    'help.cmd.interactive': 'Interactive install (scan current directory)',
    'help.cmd.install': 'Install skill from path',
    'help.cmd.agents': 'List available agents',
    'help.opt.dry_run': 'Preview installation without making changes',
    'help.opt.version': 'Show version number',
    'help.opt.help': 'Show this help message',
  }
};

export function t(key, vars = {}) {
  const text = translations[lang][key] || translations['en'][key] || key;
  return text.replace(/\{(\w+)\}/g, (match, varName) => vars[varName] ?? match);
}

export function getLanguage() {
  return lang;
}

export function isChinese() {
  return lang === 'zh';
}
