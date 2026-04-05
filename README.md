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

# Install specific git tag or commit
skillman install github.com/user/repo@v1.0.0
skillman install github.com/user/repo@abc1234
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
- **Git Version Selection**: Install from specific git tags or commits using `@ref` syntax
- **Hash-Based Versioning**: Automatically computes MD5 hash for skills without explicit version
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

## Installed Skills Tracking

Skillman tracks installed skills in `installed.json` files:

```
~/.config/skillman/installed.json          # Global installed skills
<workspace>/.qoder/installed.json          # Workspace installed skills
```

Each entry contains:
- `name`: Skill name
- `version`: Installed version (SemVer or MD5 hash)
- `isHash`: Whether version is a hash (true) or SemVer (false)
- `path`: Installation path
- `installedAt`: Installation timestamp
- `updatedAt`: Last update timestamp

This enables:
- **List Command**: `skillman list` shows all installed skills with versions
- **Update Detection**: `skillman update` checks if newer versions are available
- **Conflict Prevention**: Prevents overwriting different versions without warning
- **Clean Uninstall**: `skillman uninstall` removes both files and registry entries

**Note on Hash Versions**: When a skill's SKILL.md doesn't include a `version` field in metadata, Skillman automatically computes an MD5 hash of the file content as the version identifier. This ensures every skill has a unique version for tracking and comparison purposes.

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
