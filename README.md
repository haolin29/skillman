# Skillman

A CLI tool to install AI agent skills across multiple platforms.

## Installation

```bash
npm install -g @haolin-ai/skillman
```

## Usage

### Interactive Mode (Recommended)

Run without arguments to start the interactive installation wizard:

```bash
skillman
```

This will guide you through:
1. Scanning available skills in the current directory
2. Selecting a skill to install
3. Choosing the target agent (Claude Code, OpenClaw, Qoder, etc.)
4. Selecting installation scope (global or workspace)
5. Confirming the installation

### Install from URL

Install skills directly from GitHub or any git repository:

```bash
# GitHub shorthand
skillman install vercel-labs/agent-skills

# Full GitHub URL
skillman install https://github.com/vercel-labs/agent-skills

# With subdirectory
skillman install https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design

# GitLab or other git URLs
skillman install https://gitlab.com/org/repo
skillman install git@github.com:org/repo.git
```

### Commands

```bash
# Initialize a new skill template
skillman init [skill-name]
skillman init my-skill -v 2.0.0 -d "Description" -a "Author"

# List all available agents
skillman agents

# List installed skills
skillman list

# Update a skill
skillman update my-skill

# Uninstall a skill
skillman uninstall my-skill

# Preview installation without making changes
skillman --dry-run

# Show help
skillman --help

# Show version
skillman --version
```

## Features

- **Multi-Agent Support**: Works with Claude Code, OpenClaw, Qoder, Codex, Cursor, and more
- **Skill Template Generator**: Quickly create new skills with `skillman init`
- **Version Management**: Track and manage skill versions with `list`, `update`, and `uninstall` commands
- **Workspace History**: Remembers previously used workspace paths for quick selection
- **Bilingual Support**: Automatically switches between English and Chinese based on system language
- **Dry-Run Mode**: Preview installations before applying changes
- **Smart Path Resolution**: Automatically resolves relative paths to absolute paths

## Configuration

Agent configurations are stored in `src/agents.yaml`. Each agent has:
- `globalSkillsDir`: Global skills directory (usually in home directory)
- `skillsDir`: Relative path for workspace-specific skills

## Workspace History

When installing to a workspace scope, Skillman remembers your paths in:
```
~/.config/skillman/history.json
```

History is organized by agent, so each agent has its own list of recently used workspaces.

## Development

```bash
# Clone the repository
git clone <repo-url>
cd skillman

# Install dependencies
npm install

# Run locally
node bin/skillman.mjs
```

## License

MIT
